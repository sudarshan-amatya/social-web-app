import { io } from "socket.io-client"

export const socket = io("https://social-web-app-3.onrender.com/api", {
  autoConnect: false,
  withCredentials: true,
})