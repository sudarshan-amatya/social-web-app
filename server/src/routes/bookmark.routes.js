import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { getSavedPosts } from "../controllers/bookmark.controller.js"

const router = Router()

router.get("/", requireAuth, getSavedPosts)

export default router