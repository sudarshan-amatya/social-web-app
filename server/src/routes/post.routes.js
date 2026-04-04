import { Router } from "express"
import {
  addComment,
  createPost,
  deletePost,
  getFeedPosts,
  getPostById,
  toggleBookmark,
  toggleLike,
  toggleRepost,
  updatePost,
} from "../controllers/post.controller.js"
import { requireAuth } from "../middlewares/auth.middleware.js"

const router = Router()

router.get("/", requireAuth, getFeedPosts)
router.post("/", requireAuth, createPost)
router.get("/:postId", requireAuth, getPostById)
router.patch("/:postId", requireAuth, updatePost)
router.delete("/:postId", requireAuth, deletePost)
router.post("/:postId/comments", requireAuth, addComment)
router.post("/:postId/like-toggle", requireAuth, toggleLike)
router.post("/:postId/bookmark-toggle", requireAuth, toggleBookmark)
router.post("/:postId/repost-toggle", requireAuth, toggleRepost)

export default router