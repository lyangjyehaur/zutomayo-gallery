import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { ImageProcessor } from "@/lib/image/process";
import { R2Storage } from "@/lib/storage/r2";
import { QiniuStorage } from "@/lib/storage/qiniu";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies.get("token")?.value || "";
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload;
    try {
      payload = await verifyAuth(token);
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get role group config
    const roleGroup = await prisma.roleGroup.findUnique({
      where: { id: payload.roleGroupId },
      include: { storageStrategy: true },
    });

    if (!roleGroup) {
      return NextResponse.json({ error: "Role group not found" }, { status: 403 });
    }

    // Check rate limit if configured
    if (roleGroup.uploadRateLimit) {
      const redisKey = `rate-limit:upload:${payload.id}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, 60); // 1 minute window
      }
      if (count > roleGroup.uploadRateLimit) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }
    }

    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const albumId = formData.get("albumId") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const strategy = roleGroup.storageStrategy;
    if (!strategy) {
      return NextResponse.json(
        { error: "No storage strategy configured for this role group" },
        { status: 500 }
      );
    }

    const config = strategy.config as any;
    let storage: R2Storage | QiniuStorage;

    if (strategy.provider === "R2") {
      storage = new R2Storage(config);
    } else if (strategy.provider === "QINIU") {
      storage = new QiniuStorage(config);
    } else {
      return NextResponse.json(
        { error: `Unsupported storage provider: ${strategy.provider}` },
        { status: 500 }
      );
    }

    const uploadedImages = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer()) as unknown as Buffer;
      
      // Basic image processing/validation (just ensuring it's an image for now)
      let processedBuffer = buffer;
      try {
        processedBuffer = await ImageProcessor.process(buffer, {});
      } catch (err) {
        return NextResponse.json(
          { error: `Invalid image file: ${file.name}` },
          { status: 400 }
        );
      }

      // Generate filename based on naming rule or UUID
      const ext = file.name.split(".").pop() || "png";
      const uuid = crypto.randomUUID();
      let filename = `${uuid}.${ext}`;
      if (roleGroup.namingRule) {
        filename = roleGroup.namingRule
          .replace("{uuid}", uuid)
          .replace("{ext}", ext)
          .replace("{original}", file.name.replace(`.${ext}`, ""));
      }

      // Generate upload path
      let uploadPath = "";
      if (roleGroup.uploadPathRule) {
        const date = new Date();
        uploadPath = roleGroup.uploadPathRule
          .replace("{year}", date.getFullYear().toString())
          .replace("{month}", (date.getMonth() + 1).toString().padStart(2, "0"))
          .replace("{day}", date.getDate().toString().padStart(2, "0"));
        if (!uploadPath.endsWith("/")) {
          uploadPath += "/";
        }
      }

      const key = `${uploadPath}${filename}`;

      let url = "";
      if (strategy.provider === "R2") {
        url = await (storage as R2Storage).upload(key, processedBuffer, file.type);
      } else if (strategy.provider === "QINIU") {
        // qiniu upload method returns a string when passing a Buffer
        const qiniuRes = await (storage as QiniuStorage).upload(key, processedBuffer);
        url = typeof qiniuRes === 'string' ? qiniuRes : (qiniuRes as any).key;
      }

      const status = roleGroup.requiresAudit ? "PENDING" : "APPROVED";

      const image = await prisma.image.create({
        data: {
          filename: key,
          originalName: file.name,
          mimeType: file.type,
          size: processedBuffer.length,
          url,
          status,
          userId: payload.id,
          storageStrategyId: strategy.id,
          albumId: albumId || null,
        },
      });

      uploadedImages.push(image);
    }

    return NextResponse.json({ success: true, data: uploadedImages });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
