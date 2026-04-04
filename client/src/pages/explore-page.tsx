import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { api } from "@/lib/api"

type SearchUser = {
  id: string
  name: string
  username: string
  bio: string | null
  avatarUrl: string | null
  followersCount: number
  postsCount: number
  isFollowing: boolean
}

export function ExplorePage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [searchValue, setSearchValue] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchValue.trim()
      setDebouncedQuery(trimmed)

      if (trimmed) {
        setSearchParams({ q: trimmed })
      } else {
        setSearchParams({})
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, setSearchParams])

  const { data, isLoading } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: async () => {
      const res = await api.get(`/users/search?q=${encodeURIComponent(debouncedQuery)}`)
      return res.data.users as SearchUser[]
    },
    enabled: Boolean(debouncedQuery),
  })

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/follow-toggle`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-search", debouncedQuery] })
      await queryClient.invalidateQueries({ queryKey: ["suggested-users"] })
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
      <PageHeader
        title="Explore"
        subtitle="Search for creators and discover people to follow."
      />

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by name or username"
              className="h-11 rounded-xl border-zinc-200 bg-zinc-100 pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {!debouncedQuery ? (
        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">
              Start typing to search for users.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <>
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                </div>
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />
                </div>
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((person) => {
            const initials = person.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <Card key={person.id} className="rounded-2xl border-zinc-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={person.avatarUrl || undefined} alt={person.name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/profile/${person.username}`}
                        className="block text-base font-semibold hover:underline"
                      >
                        {person.name}
                      </Link>

                      <p className="text-sm text-zinc-500">@{person.username}</p>

                      <p className="mt-2 text-sm leading-6 text-zinc-700">
                        {person.bio || "No bio yet."}
                      </p>

                      <div className="mt-3 flex gap-4 text-sm text-zinc-500">
                        <p>{person.followersCount} followers</p>
                        <p>{person.postsCount} posts</p>
                      </div>
                    </div>

                    <Button
                      variant={person.isFollowing ? "outline" : "default"}
                      className="rounded-xl"
                      onClick={() => followMutation.mutate(person.id)}
                      disabled={followMutation.isPending}
                    >
                      {person.isFollowing ? "Following" : "Follow"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">
              No users found for “{debouncedQuery}”.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}