import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { reportComment, reportPost } from "../controllers/report.controller.js"

const router = Router()

router.post("/posts/:postId", requireAuth, reportPost)
router.post("/comments/:commentId", requireAuth, reportComment)

export default router