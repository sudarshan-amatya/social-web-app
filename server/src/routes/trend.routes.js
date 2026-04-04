import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { getTrendingTags } from "../controllers/trend.controller.js"

const router = Router()

router.get("/", requireAuth, getTrendingTags)

export default router