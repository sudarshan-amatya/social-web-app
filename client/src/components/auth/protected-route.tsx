import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { JSX } from "react"

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-zinc-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}