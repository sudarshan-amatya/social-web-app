import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  getProfile,
  getSuggestedUsers,
  getUserPosts,
  searchUsers,
  toggleFollow,
  updateMyProfile,
} from "../controllers/user.controller.js"

const router = Router()

router.get("/suggestions", requireAuth, getSuggestedUsers)
router.get("/search", requireAuth, searchUsers)
router.patch("/me", requireAuth, updateMyProfile)
router.post("/:userId/follow-toggle", requireAuth, toggleFollow)
router.get("/:username/posts", requireAuth, getUserPosts)
router.get("/:username", requireAuth, getProfile)

export default router