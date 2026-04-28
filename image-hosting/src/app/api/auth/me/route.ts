import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);

    // Fallback to Authorization header for API usage
    const authHeader = request.headers.get("authorization");
    let token = tokenMatch ? tokenMatch[1] : null;

    if (!token && authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAuth(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { roleGroup: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roleGroup: user.roleGroup,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
