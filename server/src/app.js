import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRoutes from "./routes/auth.routes.js"
import postRoutes from "./routes/post.routes.js"
import userRoutes from "./routes/user.routes.js"
import notificationRoutes from "./routes/notification.routes.js"
import uploadRoutes from "./routes/upload.routes.js"
import bookmarkRoutes from "./routes/bookmark.routes.js"
import messageRoutes from "./routes/message.routes.js"
import commentRoutes from "./routes/comment.routes.js"
import trendRoutes from "./routes/trend.routes.js"
import reportRoutes from "./routes/report.routes.js"

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
)

app.use(express.json())
app.use(cookieParser())

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API is running" })
})

app.use("/api/auth", authRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/users", userRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/uploads", uploadRoutes)
app.use("/api/bookmarks", bookmarkRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/trends", trendRoutes)
app.use("/api/reports", reportRoutes)

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
})

export default app