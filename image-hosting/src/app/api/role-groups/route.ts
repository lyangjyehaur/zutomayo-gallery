import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Basic auth middleware function for API routes
async function requireAuth(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  const authHeader = request.headers.get("authorization");
  let token = tokenMatch ? tokenMatch[1] : null;

  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    throw new Error("Unauthorized");
  }

  return await verifyAuth(token);
}

export async function GET(request: Request) {
  try {
    // In a real scenario, you'd check if the user is an admin here
    await requireAuth(request);

    const roleGroups = await prisma.roleGroup.findMany({
      include: {
        storageStrategy: true,
      },
    });

    return NextResponse.json({ roleGroups });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    // In a real scenario, check admin privileges
    await requireAuth(request);

    const body = await request.json();
    const {
      name,
      description,
      uploadPathRule,
      namingRule,
      uploadRateLimit,
      requiresAudit,
      storageStrategyId,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newRoleGroup = await prisma.roleGroup.create({
      data: {
        name,
        description,
        uploadPathRule,
        namingRule,
        uploadRateLimit,
        requiresAudit: requiresAudit ?? false,
        storageStrategyId,
      },
    });

    return NextResponse.json({ roleGroup: newRoleGroup }, { status: 201 });
  } catch (error: any) {
    console.error("Create RoleGroup error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
