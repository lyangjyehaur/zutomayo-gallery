import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { R2Storage } from "@/lib/storage/r2";
import { QiniuStorage } from "@/lib/storage/qiniu";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await prisma.image.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Publicly accessible if approved or requested by owner (we can make it simple for now)
    return NextResponse.json({ success: true, data: image });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const image = await prisma.image.findUnique({
      where: { id },
      include: { storageStrategy: true },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.userId !== payload.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const strategy = image.storageStrategy;
    if (strategy) {
      const config = strategy.config as any;
      let storage: R2Storage | QiniuStorage;

      if (strategy.provider === "R2") {
        storage = new R2Storage(config);
      } else if (strategy.provider === "QINIU") {
        storage = new QiniuStorage(config);
      }

      if (storage!) {
        try {
          await storage.delete(image.filename);
        } catch (storageErr) {
          console.error("Storage delete error:", storageErr);
          // Continue to delete from DB even if storage delete fails, or maybe handle it differently
        }
      }
    }

    await prisma.image.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Image deleted" });
  } catch (error: any) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
