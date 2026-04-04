import { Server } from "socket.io"
import jwt from "jsonwebtoken"

let ioInstance = null

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const index = part.indexOf("=")
      if (index === -1) return acc

      const key = decodeURIComponent(part.slice(0, index).trim())
      const value = decodeURIComponent(part.slice(index + 1).trim())
      acc[key] = value
      return acc
    }, {})
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || "")
      const token = cookies.token

      if (!token) {
        return next(new Error("Unauthorized"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.userId
      next()
    } catch {
      next(new Error("Unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`)

    socket.on("conversation:join", (conversationId) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        socket.join(`conversation:${conversationId}`)
      }
    })

    socket.on("conversation:leave", (conversationId) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        socket.leave(`conversation:${conversationId}`)
      }
    })
  })

  ioInstance = io
  return io
}

export function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO has not been initialized")
  }

  return ioInstance
}