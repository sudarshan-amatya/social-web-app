import axios from "axios"

export const api = axios.create({
  baseURL: "https://social-web-app-3.onrender.com",
  withCredentials: true,
})