import { NavLink, useNavigate } from "react-router-dom"
import {
  Bell,
  Bookmark,
  Compass,
  Home,
  LogOut,
  Mail,
  Settings,
  User,
  PencilLine,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { useNavBadges } from "@/hooks/use-nav-badges"

const navItems = [
  { to: "/", label: "Home", icon: Home, key: "home" },
  { to: "/explore", label: "Explore", icon: Compass, key: "explore" },
  { to: "/saved", label: "Saved", icon: Bookmark, key: "saved" },
  { to: "/notifications", label: "Notifications", icon: Bell, key: "notifications" },
  { to: "/messages", label: "Messages", icon: Mail, key: "messages" },
  { to: "/settings", label: "Settings", icon: Settings, key: "settings" },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { unreadNotifications, unreadConversations } = useNavBadges()

  async function handleLogout() {
    await logout()
    navigate("/login")
  }

  function handleCreatePost() {
    navigate("/?compose=1")
  }

  function getBadgeCount(key: string) {
    if (key === "notifications") return unreadNotifications
    if (key === "messages") return unreadConversations
    return 0
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-white shadow-sm">
          SW
        </div>
        <div>
          <p className="text-sm font-semibold">Social Web</p>
          <p className="text-xs text-foreground">Modern community platform</p>
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardContent className="p-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const badgeCount = getBadgeCount(item.key)

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-zinc-800 hover:text-white",
                      isActive ? "bg-zinc-800 text-white hover:bg-zinc-900" : "text-card-foreground"
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>

                  {badgeCount > 0 ? (
                    <span className="ml-auto inline-flex min-w-5.5 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  ) : null}
                </NavLink>
              )
            })}

            {user ? (
              <NavLink
                to={`/profile/${user.username}`}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-zinc-800 hover:text-white",
                    isActive ? "bg-zinc-800 text-white hover:bg-zinc-900" : "text-card-foreground"
                  )
                }
              >
                <User className="h-5 w-5" />
                <span>Profile</span>
              </NavLink>
            ) : null}
          </nav>

          <Button className="mt-4 h-11 w-full rounded-xl" onClick={handleCreatePost}>
            <PencilLine className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name || "Guest"}</p>
              <p className="truncate text-xs text-zinc-500">
                {user ? `@${user.username}` : "Not signed in"}
              </p>
            </div>
          </div>

          <Button variant="outline" className="w-full rounded-xl" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}