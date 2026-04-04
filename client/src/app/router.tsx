import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppShell } from "@/layouts/app-shell"
import { HomePage } from "@/pages/home-page"
import { ExplorePage } from "@/pages/explore-page"
import { ProfilePage } from "@/pages/profile-page"
import { NotificationsPage } from "@/pages/notifications-page"
import { MessagesPage } from "@/pages/messages-page"
import { SettingsPage } from "@/pages/settings-page"
import { LoginPage } from "@/pages/login-page"
import { RegisterPage } from "@/pages/register-page"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PostDetailPage } from "@/pages/post-detail-page"
import { SavedPage } from "@/pages/saved-page"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "saved", element: <SavedPage /> },
      { path: "post/:postId", element: <PostDetailPage /> },
      { path: "profile/:username", element: <ProfilePage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
])