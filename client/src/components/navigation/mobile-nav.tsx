import { NavLink } from "react-router-dom"
import { Bell, Bookmark, Home, Mail, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { useNavBadges } from "@/hooks/use-nav-badges"

export function MobileNav() {
  const { user } = useAuth()
  const { unreadNotifications, unreadConversations } = useNavBadges()

  const items = [
    { to: "/", icon: Home, label: "Home", key: "home" },
    { to: "/saved", icon: Bookmark, label: "Saved", key: "saved" },
    { to: "/messages", icon: Mail, label: "Messages", key: "messages" },
    { to: "/notifications", icon: Bell, label: "Alerts", key: "notifications" },
    { to: user ? `/profile/${user.username}` : "/login", icon: User, label: "Profile", key: "profile" },
  ]

  function getBadgeCount(key: string) {
    if (key === "notifications") return unreadNotifications
    if (key === "messages") return unreadConversations
    return 0
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-lg backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const badgeCount = getBadgeCount(item.key)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium transition",
                  isActive ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                )
              }
            >
              {badgeCount > 0 ? (
                <span className="absolute right-2 top-1 min-w-4.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}

              <Icon className="mb-1 h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}