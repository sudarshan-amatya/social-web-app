import dotenv from "dotenv"
import { createServer } from "http"
import app from "./app.js"
import { initSocket } from "./socket.js"

dotenv.config()

const PORT = process.env.PORT || 10000
const httpServer = createServer(app)

initSocket(httpServer)

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})