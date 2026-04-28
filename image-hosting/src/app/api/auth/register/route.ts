import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or username already exists" },
        { status: 409 },
      );
    }

    // Get or create default role group
    let defaultRoleGroup = await prisma.roleGroup.findFirst({
      where: { name: "Default User" },
    });

    if (!defaultRoleGroup) {
      defaultRoleGroup = await prisma.roleGroup.create({
        data: {
          name: "Default User",
          description: "Default role group for new users",
          requiresAudit: false,
        },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        roleGroupId: defaultRoleGroup.id,
      },
    });

    // Create token
    const token = await createToken({
      id: user.id,
      username: user.username,
      roleGroupId: user.roleGroupId,
    });

    const response = NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: user.id, username: user.username, email: user.email },
      },
      { status: 201 },
    );

    // Set cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
