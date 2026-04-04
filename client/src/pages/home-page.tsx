import { useEffect, useRef, useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { Image, Smile, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { PostCard } from "@/components/shared/post-card"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"

type FeedItem = {
  id: string
  createdAt: string
  isRepost: boolean
  reposter: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  } | null
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

type FeedPage = {
  posts: FeedItem[]
  nextCursor: {
    id: string
    createdAt: string
  } | null
}

const emojis = ["😀", "😂", "😍", "🔥", "🎉", "😎", "🥳", "🤯", "🙏", "❤️", "💯", "✨"]

function formatPostTime(dateString: string) {
  return new Date(dateString).toLocaleString()
}

export function HomePage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTag = searchParams.get("tag") || ""
  const activeFeed = searchParams.get("feed") === "following" ? "following" : "for-you"

  const [content, setContent] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [error, setError] = useState("")

  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed", activeTag, activeFeed],
    initialPageParam: null as FeedPage["nextCursor"],
    queryFn: async ({ pageParam }) => {
      const res = await api.get("/posts", {
        params: {
          limit: 10,
          cursorId: pageParam?.id,
          cursorCreatedAt: pageParam?.createdAt,
          tag: activeTag || undefined,
          feedType: activeFeed,
        },
      })

      return res.data as FeedPage
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  const posts = data?.pages.flatMap((page) => page.posts) ?? []

  useEffect(() => {
    if (searchParams.get("compose") !== "1") return

    requestAnimationFrame(() => {
      composerRef.current?.focus()
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })

      const next = new URLSearchParams(searchParams)
      next.delete("compose")
      setSearchParams(next, { replace: true })
    })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage()
        }
      },
      { rootMargin: "300px" }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const createPostMutation = useMutation({
    mutationFn: async () => {
      let imageUrl: string | null = null

      if (selectedImage) {
        const formData = new FormData()
        formData.append("image", selectedImage)

        const uploadRes = await api.post("/uploads/image?type=post", formData)
        imageUrl = uploadRes.data.imageUrl
      }

      await api.post("/posts", {
        content,
        imageUrl,
      })
    },
    onSuccess: async () => {
      setContent("")
      setShowEmojiPicker(false)
      setSelectedImage(null)
      setPreviewUrl("")
      setError("")
      await queryClient.invalidateQueries({ queryKey: ["feed"] })
      await queryClient.invalidateQueries({ queryKey: ["profile-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["trends"] })
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not create post")
    },
  })

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/like-toggle`)
    },
    onSuccess: async (_data, postId) => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] })
      await queryClient.invalidateQueries({ queryKey: ["post", postId] })
      await queryClient.invalidateQueries({ queryKey: ["profile-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread-summary"] })
    },
  })

  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/bookmark-toggle`)
    },
    onSuccess: async (_data, postId) => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] })
      await queryClient.invalidateQueries({ queryKey: ["post", postId] })
      await queryClient.invalidateQueries({ queryKey: ["profile-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] })
    },
  })

  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/repost-toggle`)
    },
    onSuccess: async (_data, postId) => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] })
      await queryClient.invalidateQueries({ queryKey: ["post", postId] })
      await queryClient.invalidateQueries({ queryKey: ["profile-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] })
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread-summary"] })
    },
  })

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  function handleImageChange(file: File | null) {
    if (!file) return
    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearImage() {
    setSelectedImage(null)
    setPreviewUrl("")
  }

  function insertEmojiAtCursor(emoji: string) {
    const textarea = composerRef.current
    if (!textarea) {
      setContent((prev) => `${prev}${emoji}`)
      setShowEmojiPicker(false)
      return
    }

    const start = textarea.selectionStart ?? content.length
    const end = textarea.selectionEnd ?? content.length

    const nextValue = content.slice(0, start) + emoji + content.slice(end)
    setContent(nextValue)
    setShowEmojiPicker(false)

    requestAnimationFrame(() => {
      textarea.focus()
      const nextCursor = start + emoji.length
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  function handleSubmit() {
    if (!content.trim() && !selectedImage) {
      setError("Write something or add an image before posting")
      return
    }

    createPostMutation.mutate()
  }

  function changeFeed(feed: "for-you" | "following") {
    const next = new URLSearchParams(searchParams)
    next.set("feed", feed)
    setSearchParams(next)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Home"
          subtitle={
            activeTag
              ? `Showing posts tagged with #${activeTag}`
              : activeFeed === "following"
              ? "Posts from people you follow."
              : "Posts from across your network."
          }
        />

        {activeTag ? (
          <Button
            variant="outline"
            className="rounded-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.delete("tag")
              setSearchParams(next)
            }}
          >
            Clear tag
          </Button>
        ) : null}
      </div>

      <Tabs value={activeFeed}>
        <TabsList className=" grid h-11 w-full grid-cols-2 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <TabsTrigger
            value="for-you"
            className="rounded-lg text-zinc-600 data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:text-zinc-300 dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900"
            onClick={() => changeFeed("for-you")}
          >
            For you
          </TabsTrigger>
          <TabsTrigger
            value="following"
            className="rounded-lg text-zinc-600 data-[state=active]:bg-zinc-900 data-[state=active]:text-white dark:text-zinc-300 dark:data-[state=active]:bg-zinc-100 dark:data-[state=active]:text-zinc-900"
            onClick={() => changeFeed("following")}
          >
            Following
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "User"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 pt-4">
              <textarea
                ref={composerRef}
                placeholder="What’s happening?"
                className="min-h-20 w-full resize-none border-none bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              {showEmojiPicker ? (
                <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-full px-3 py-2 text-lg transition hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      onClick={() => insertEmojiAtCursor(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}

              {previewUrl ? (
                <div className="relative mt-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-90 w-full rounded-2xl border border-zinc-200 object-cover dark:border-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow dark:bg-zinc-900/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {error ? (
                <p className="mb-3 mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <Image className="h-4 w-4" />
                  Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                  />
                </label>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  <Smile className="h-4 w-4" />
                  Emojis
                </button>

                <Button
                  className="ml-auto rounded-xl"
                  onClick={handleSubmit}
                  disabled={createPostMutation.isPending}
                >
                  {createPostMutation.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
            </CardContent>
          </Card>
        ) : posts.length > 0 ? (
          <>
            {posts.map((item) => (
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
                repostedBy={
                  item.reposter
                    ? {
                        name: item.reposter.name,
                        username: item.reposter.username,
                      }
                    : null
                }
                onToggleLike={() => likeMutation.mutate(item.post.id)}
                onToggleBookmark={() => bookmarkMutation.mutate(item.post.id)}
                onToggleRepost={() => repostMutation.mutate(item.post.id)}
              />
            ))}

            <div ref={loadMoreRef} />

            {isFetchingNextPage ? (
              <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <CardContent className="p-5">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading more posts...</p>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {activeFeed === "following"
                  ? "No posts from people you follow yet."
                  : "No posts yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}