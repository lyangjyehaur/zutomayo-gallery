import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPublic = searchParams.get("public") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const albumId = searchParams.get("albumId");
    
    const skip = (page - 1) * limit;
    
    let where: any = {};
    
    if (isPublic) {
      where.status = "APPROVED";
      if (albumId) where.albumId = albumId;
    } else {
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

      where.userId = payload.id;
      if (albumId) where.albumId = albumId;
    }

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { username: true } } }, // Include user for author display
      }),
      prisma.image.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: images,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch images error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
