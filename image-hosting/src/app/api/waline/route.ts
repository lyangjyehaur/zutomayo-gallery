import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ImageProcessor } from "@/lib/image/process";
import { R2Storage } from "@/lib/storage/r2";
import { QiniuStorage } from "@/lib/storage/qiniu";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Use the first active storage strategy for Waline uploads
    const strategy = await prisma.storageStrategy.findFirst({
      where: { isActive: true },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "No active storage strategy found" },
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
    
    const buffer = Buffer.from(await file.arrayBuffer()) as unknown as Buffer;
    
    // Process image
    let processedBuffer = buffer;
    try {
      processedBuffer = await ImageProcessor.process(buffer, {});
    } catch (err) {
      return NextResponse.json(
        { error: `Invalid image file: ${file.name}` },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "png";
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.${ext}`;
    
    // Default Waline upload path
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const uploadPath = `waline/${year}/${month}/`;
    
    const key = `${uploadPath}${filename}`;

    let url = "";
    if (strategy.provider === "R2") {
      url = await (storage as R2Storage).upload(key, processedBuffer, file.type);
    } else if (strategy.provider === "QINIU") {
      const qiniuRes = await (storage as QiniuStorage).upload(key, processedBuffer);
      url = typeof qiniuRes === 'string' ? qiniuRes : (qiniuRes as any).key;
    }

    // Optionally save to DB as a generic system image or let it be unmanaged
    // For now, we save it with a system user or null user if we adjust schema
    // Wait, User is required for Image model.
    // If no user is authenticated, we might need a system user or skip DB.
    // Let's check schema: userId is required. 
    // Let's create a "waline_system" user if not exists, or just skip DB for Waline.
    // Skipping DB for Waline is usually okay because Waline manages its own image links in comments.
    // But to keep storage clean, let's insert it if possible.
    // I will just return the URL, Waline doesn't care about our DB.

    // Return the format Waline expects
    return NextResponse.json({
      url: url,
      src: url,
      data: {
        url: url,
        src: url,
      },
    });
  } catch (error: any) {
    console.error("Waline upload error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
