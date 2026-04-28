import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

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

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    await requireAuth(request);

    const roleGroup = await prisma.roleGroup.findUnique({
      where: { id: params.id },
      include: {
        storageStrategy: true,
      },
    });

    if (!roleGroup) {
      return NextResponse.json(
        { error: "RoleGroup not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ roleGroup });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
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

    const updatedRoleGroup = await prisma.roleGroup.update({
      where: { id: params.id },
      data: {
        name,
        description,
        uploadPathRule,
        namingRule,
        uploadRateLimit,
        requiresAudit,
        storageStrategyId,
      },
    });

    return NextResponse.json({ roleGroup: updatedRoleGroup });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    await requireAuth(request);

    // Check if there are users in this role group
    const usersCount = await prisma.user.count({
      where: { roleGroupId: params.id },
    });

    if (usersCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete role group with associated users" },
        { status: 400 },
      );
    }

    await prisma.roleGroup.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "RoleGroup deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.message === "Unauthorized" ? 401 : 500 },
    );
  }
}
