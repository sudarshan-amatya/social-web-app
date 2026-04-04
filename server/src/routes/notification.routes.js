import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import {
  getNotifications,
  getUnreadNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js"

const router = Router()

router.get("/", requireAuth, getNotifications)
router.get("/unread-summary", requireAuth, getUnreadNotificationSummary)
router.patch("/read-all", requireAuth, markAllNotificationsRead)
router.patch("/:notificationId/read", requireAuth, markNotificationRead)

export default router