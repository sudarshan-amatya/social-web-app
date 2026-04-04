import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { PostCard } from "@/components/shared/post-card"
import { api } from "@/lib/api"

type SavedItem = {
  id: string
  createdAt: string
  isRepost: boolean
  reposter: null
  post: {
    id: string
    content: string
    imageUrl: string | null
    createdAt: string
    likedByMe: boolean
    bookmarkedByMe: boolean
    repostedByMe: boolean
    _count: {
      likes: number
      comments: number
      reposts: number
    }
    author: {
      id: string
      name: string
      username: string
      avatarUrl: string | null
    }
  }
}

function formatPostTime(dateString: string) {
  return new Date(dateString).toLocaleString()
}

export function SavedPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["saved-posts"],
    queryFn: async () => {
      const res = await api.get("/bookmarks")
      return res.data.posts as SavedItem[]
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/bookmark-toggle`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["feed"] })
    },
  })

  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/repost-toggle`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["feed"] })
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
      <PageHeader title="Saved" subtitle="Posts you bookmarked for later." />

      <div className="space-y-4">
        {isLoading ? (
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-500">Loading saved posts...</p>
            </CardContent>
          </Card>
        ) : data && data.length > 0 ? (
          data.map((item) => (
            <PostCard
              key={item.id}
              id={item.post.id}
              name={item.post.author.name}
              username={item.post.author.username}
              content={item.post.content}
              time={formatPostTime(item.post.createdAt)}
              likesCount={item.post._count.likes}
              commentsCount={item.post._count.comments}
              repostsCount={item.post._count.reposts}
              likedByMe={item.post.likedByMe}
              bookmarkedByMe={item.post.bookmarkedByMe}
              repostedByMe={item.post.repostedByMe}
              avatarUrl={item.post.author.avatarUrl}
              imageUrl={item.post.imageUrl}
              onToggleBookmark={() => bookmarkMutation.mutate(item.post.id)}
              onToggleRepost={() => repostMutation.mutate(item.post.id)}
            />
          ))
        ) : (
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-500">No saved posts yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}