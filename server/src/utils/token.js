import jwt from "jsonwebtoken";

export function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";

  // backend cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });
}
