import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"

type SuggestedUser = {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  followersCount: number
}

type Trend = {
  name: string
  count: number
}

export function RightSidebar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["trends"],
    queryFn: async () => {
      const res = await api.get("/trends")
      return res.data.trends as Trend[]
    },
    refetchInterval: 60000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ["suggested-users"],
    queryFn: async () => {
      const res = await api.get("/users/suggestions")
      return res.data.users as SuggestedUser[]
    },
  })

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/follow-toggle`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["suggested-users"] })
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread-summary"] })
    },
  })

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Trending now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendsLoading ? (
            <>
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </>
          ) : trends && trends.length > 0 ? (
            trends.map((trend) => (
              <button
                key={trend.name}
                type="button"
                onClick={() => navigate(`/?tag=${encodeURIComponent(trend.name)}`)}
                className="cursor-pointer w-full rounded-xl bg-card px-3 py-3 text-left transition hover:bg-zinc-200 dark:hover:bg-zinc-800 "
              >
                <p className="text-sm font-semibold text-card-foreground ">#{trend.name}</p>
                <p className="text-xs text-foreground">{trend.count} tagged posts</p>
              </button>
            ))
          ) : (
            <p className="text-sm text-zinc-500">No trends right now.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Who to follow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-9 w-20 rounded-xl" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-9 w-20 rounded-xl" />
              </div>
            </>
          ) : data && data.length > 0 ? (
            data.map((person) => {
              const initials = person.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()

              return (
                <div key={person.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={person.avatarUrl || undefined} alt={person.name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/profile/${person.username}`}
                      className="block truncate text-sm font-semibold hover:underline"
                    >
                      {person.name}
                    </Link>
                    <p className="truncate text-xs text-zinc-500">
                      @{person.username} · {person.followersCount} followers
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => followMutation.mutate(person.id)}
                    disabled={followMutation.isPending}
                  >
                    Follow
                  </Button>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-zinc-500">No suggestions right now.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}