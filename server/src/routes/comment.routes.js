import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  addCommentReply,
  deleteComment,
  toggleCommentLike,
} from "../controllers/comment.controller.js"

const router = Router()

router.post("/:commentId/replies", requireAuth, addCommentReply)
router.post("/:commentId/like-toggle", requireAuth, toggleCommentLike)
router.delete("/:commentId", requireAuth, deleteComment)

export default router