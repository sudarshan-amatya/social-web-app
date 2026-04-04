import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  createOrGetConversation,
  getConversationById,
  getConversations,
  getUnreadSummary,
  markConversationRead,
  sendMessage,
} from "../controllers/message.controller.js"

const router = Router()

router.get("/conversations", requireAuth, getConversations)
router.get("/unread-summary", requireAuth, getUnreadSummary)
router.post("/conversations", requireAuth, createOrGetConversation)
router.get("/conversations/:conversationId", requireAuth, getConversationById)
router.post("/conversations/:conversationId/messages", requireAuth, sendMessage)
router.patch("/conversations/:conversationId/read", requireAuth, markConversationRead)

export default router