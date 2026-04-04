export function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production"

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  })
}