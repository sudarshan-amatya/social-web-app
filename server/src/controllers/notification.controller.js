import { prisma } from "../config/prisma.js";
export async function markNotificationRead(req, res) {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: req.userId,
      },
      select: {
        id: true,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
      },
    });

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("MARK_NOTIFICATION_READ_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: req.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      take: 30,
    });

    return res.json({ notifications });
  } catch (error) {
    console.error("GET_NOTIFICATIONS_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getUnreadNotificationSummary(req, res) {
  try {
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: req.userId,
        isRead: false,
      },
    });

    return res.json({ unreadCount });
  } catch (error) {
    console.error("GET_UNREAD_NOTIFICATION_SUMMARY_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: {
        recipientId: req.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("MARK_ALL_NOTIFICATIONS_READ_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
