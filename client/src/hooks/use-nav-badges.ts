import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useNavBadges() {
  const { data: notificationData } = useQuery({
    queryKey: ["notifications-unread-summary"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-summary")
      return res.data as { unreadCount: number }
    },
    refetchInterval: 5000,
  })

  const { data: messageData } = useQuery({
    queryKey: ["message-unread-summary"],
    queryFn: async () => {
      const res = await api.get("/messages/unread-summary")
      return res.data as {
        unreadMessages: number
        unreadConversations: number
      }
    },
    refetchInterval: 5000,
  })

  return {
    unreadNotifications: notificationData?.unreadCount ?? 0,
    unreadMessages: messageData?.unreadMessages ?? 0,
    unreadConversations: messageData?.unreadConversations ?? 0,
  }
}