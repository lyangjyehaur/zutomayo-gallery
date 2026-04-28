import { jwtVerify, SignJWT } from "jose";

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error("The environment variable JWT_SECRET is not set.");
  }
  return secret;
};

export const verifyAuth = async (token: string) => {
  try {
    const verified = await jwtVerify(
      token,
      new TextEncoder().encode(getJwtSecretKey()),
    );
    return verified.payload as {
      id: string;
      username: string;
      roleGroupId: string;
    };
  } catch (err) {
    throw new Error("Your token has expired or is invalid.");
  }
};

export const createToken = async (payload: {
  id: string;
  username: string;
  roleGroupId: string;
}) => {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(getJwtSecretKey()));
  return token;
};
