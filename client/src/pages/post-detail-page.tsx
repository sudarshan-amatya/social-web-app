import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Image,
  X,
  Pencil,
  Trash2,
  Bookmark,
  Repeat2,
  CornerDownRight,
  Flag,
  MoreHorizontal,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

type Author = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

type ReplyItem = {
  id: string;
  content: string;
  createdAt: string;
  likedByMe: boolean;
  _count: {
    likes: number;
  };
  author: Author;
};

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  likedByMe: boolean;
  _count: {
    likes: number;
    replies: number;
  };
  author: Author;
  replies: ReplyItem[];
};

type PostDetail = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: Author;
  comments: CommentItem[];
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  repostedByMe: boolean;
  _count: {
    likes: number;
    comments: number;
    reposts: number;
  };
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [editContent, setEditContent] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const res = await api.get(`/posts/${postId}`);
      return res.data.post as PostDetail;
    },
    enabled: Boolean(postId),
  });

  useEffect(() => {
    if (data) {
      setEditContent(data.content || "");
      setEditImageUrl(data.imageUrl || null);
      setEditPreviewUrl(data.imageUrl || "");
      setEditImageFile(null);
    }
  }, [data]);

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      await api.post(`/posts/${postId}/comments`, { content });
    },
    onSuccess: async () => {
      setComment("");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications-unread-summary"],
      });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not add comment");
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      await api.post(`/comments/${commentId}/replies`, { content });
    },
    onSuccess: async () => {
      setReplyText("");
      setReplyTargetId(null);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications-unread-summary"],
      });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not add reply");
    },
  });

  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.post(`/comments/${commentId}/like-toggle`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications-unread-summary"],
      });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not like comment");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-posts"] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not delete comment");
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/posts/${postId}/like-toggle`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications-unread-summary"],
      });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not like post");
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/posts/${postId}/bookmark-toggle`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not save post");
    },
  });

  const repostMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/posts/${postId}/repost-toggle`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications-unread-summary"],
      });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not repost post");
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async () => {
      let nextImageUrl = editImageUrl;

      if (editImageFile) {
        const formData = new FormData();
        formData.append("image", editImageFile);

        const uploadRes = await api.post("/uploads/image?type=post", formData);
        nextImageUrl = uploadRes.data.imageUrl;
      }

      await api.patch(`/posts/${postId}`, {
        content: editContent,
        imageUrl: nextImageUrl,
      });
    },
    onSuccess: async () => {
      setIsEditing(false);
      setMenuOpen(false);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["post", postId] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({
        queryKey: ["profile-posts", data?.author.username],
      });
      await queryClient.invalidateQueries({
        queryKey: ["profile", data?.author.username],
      });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not update post");
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/posts/${postId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({
        queryKey: ["profile-posts", data?.author.username],
      });
      await queryClient.invalidateQueries({
        queryKey: ["profile", data?.author.username],
      });
      navigate(data ? `/profile/${data.author.username}` : "/");
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not delete post");
    },
  });

  const reportPostMutation = useMutation({
    mutationFn: async ({
      reason,
      details,
    }: {
      reason: string;
      details?: string;
    }) => {
      await api.post(`/reports/posts/${postId}`, { reason, details });
    },
    onSuccess: () => {
      window.alert("Post reported successfully");
      setMenuOpen(false);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not report post");
    },
  });

  const reportCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      reason,
      details,
    }: {
      commentId: string;
      reason: string;
      details?: string;
    }) => {
      await api.post(`/reports/comments/${commentId}`, { reason, details });
    },
    onSuccess: () => {
      window.alert("Comment reported successfully");
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not report comment");
    },
  });

  function handleCommentSubmit() {
    if (!comment.trim()) {
      setError("Write a comment first");
      return;
    }

    commentMutation.mutate(comment);
  }

  function handleReplySubmit(commentId: string) {
    if (!replyText.trim()) {
      setError("Write a reply first");
      return;
    }

    replyMutation.mutate({ commentId, content: replyText });
  }

  function handleEditImageChange(file: File | null) {
    if (!file) return;
    setEditImageFile(file);
    setEditPreviewUrl(URL.createObjectURL(file));
  }

  function removeEditImage() {
    setEditImageFile(null);
    setEditImageUrl(null);
    setEditPreviewUrl("");
  }

  function handleSaveEdit() {
    if (!editContent.trim() && !editPreviewUrl) {
      setError("Post content or image is required");
      return;
    }

    updatePostMutation.mutate();
  }

  function handleDeletePost() {
    const ok = window.confirm("Delete this post?");
    if (!ok) return;
    deletePostMutation.mutate();
  }

  function handleDeleteComment(commentId: string) {
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;
    deleteCommentMutation.mutate(commentId);
  }

  function promptReport(target: "post" | "comment", commentId?: string) {
    const reason = window
      .prompt(
        "Report reason? Example: spam, abuse, harassment, misinformation, copyright, other",
      )
      ?.trim();

    if (!reason) return;

    const details =
      window.prompt("Add more details if needed (optional)")?.trim() || "";

    if (target === "post") {
      reportPostMutation.mutate({ reason, details });
      return;
    }

    if (commentId) {
      reportCommentMutation.mutate({ commentId, reason, details });
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
        <PageHeader title="Post" subtitle="Loading post..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
        <PageHeader title="Post" subtitle="Post not found." />
      </div>
    );
  }

  const isPostOwner = user?.id === data.author.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
      <PageHeader title="Post" subtitle="View conversation and replies." />

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardContent className="relative p-5">
          {!isEditing ? (
            <div className="absolute right-5 top-5">
              <button
                type="button"
                className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
                  {isPostOwner ? (
                    <>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-zinc-100 dark:text-black"
                        onClick={() => {
                          setIsEditing(true);
                          setMenuOpen(false);
                          setError("");
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                        onClick={handleDeletePost}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-zinc-100 dark:text-black"
                      onClick={() => promptReport("post")}
                    >
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <Link to={`/profile/${data.author.username}`}>
              <Avatar className="h-11 w-11">
                <AvatarImage
                  src={data.author.avatarUrl || undefined}
                  alt={data.author.name}
                />
                <AvatarFallback>{initials(data.author.name)}</AvatarFallback>
              </Avatar>
            </Link>

            <div className="min-w-0 flex-1 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/profile/${data.author.username}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {data.author.name}
                </Link>
                <Link
                  to={`/profile/${data.author.username}`}
                  className="text-sm text-zinc-500 hover:underline"
                >
                  @{data.author.username}
                </Link>
              </div>

              {isEditing ? (
                <div className="mt-4 space-y-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-30 w-full resize-none rounded-2xl border border-zinc-200 bg-white p-3 text-[15px] outline-none"
                    placeholder="Edit your post"
                  />

                  {editPreviewUrl ? (
                    <div className="relative">
                      <img
                        src={editPreviewUrl}
                        alt="Preview"
                        className="max-h-105 w-full rounded-2xl border border-zinc-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeEditImage}
                        className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100">
                    <Image className="h-4 w-4" />
                    Replace image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleEditImageChange(e.target.files?.[0] || null)
                      }
                    />
                  </label>

                  <div className="flex gap-3">
                    <Button
                      className="rounded-xl"
                      onClick={handleSaveEdit}
                      disabled={updatePostMutation.isPending}
                    >
                      {updatePostMutation.isPending
                        ? "Saving..."
                        : "Save changes"}
                    </Button>

                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(data.content || "");
                        setEditImageUrl(data.imageUrl || null);
                        setEditPreviewUrl(data.imageUrl || "");
                        setEditImageFile(null);
                        setError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {data.content ? (
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800 dark:text-zinc-300">
                      {data.content}
                    </p>
                  ) : null}

                  {data.imageUrl ? (
                    <img
                      src={data.imageUrl}
                      alt="Post"
                      className="mt-4 max-h-105 w-full rounded-2xl border border-zinc-200 object-cover"
                    />
                  ) : null}
                </>
              )}

              <p className="mt-3 text-sm text-zinc-500">
                {formatTime(data.createdAt)}
              </p>

              {error ? (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              ) : null}

              {!isEditing ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant={data.likedByMe ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    {data._count.likes}
                  </Button>

                  <Button variant="outline" className="rounded-xl" disabled>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {data._count.comments}
                  </Button>

                  <Button
                    variant={data.repostedByMe ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => repostMutation.mutate()}
                    disabled={repostMutation.isPending}
                  >
                    <Repeat2 className="mr-2 h-4 w-4" />
                    {data._count.reposts}
                  </Button>

                  <Button
                    variant={data.bookmarkedByMe ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => bookmarkMutation.mutate()}
                    disabled={bookmarkMutation.isPending}
                  >
                    <Bookmark className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardContent className="p-5">
          <textarea
            placeholder="Write a comment..."
            className="min-h-25 w-full resize-none border-none bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              className="rounded-xl"
              onClick={handleCommentSubmit}
              disabled={commentMutation.isPending}
            >
              {commentMutation.isPending ? "Posting..." : "Comment"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {data.comments.length > 0 ? (
          data.comments.map((item) => {
            const isOwnComment = user?.id === item.author.id;
            const canDeleteComment =
              isOwnComment || user?.id === data.author.id;

            return (
              <Card
                key={item.id}
                className="rounded-2xl border-zinc-200 shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Link to={`/profile/${item.author.username}`}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={item.author.avatarUrl || undefined}
                          alt={item.author.name}
                        />
                        <AvatarFallback>
                          {initials(item.author.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/profile/${item.author.username}`}
                          className="text-sm font-semibold hover:underline"
                        >
                          {item.author.name}
                        </Link>
                        <Link
                          to={`/profile/${item.author.username}`}
                          className="text-sm text-zinc-500 hover:underline"
                        >
                          @{item.author.username}
                        </Link>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-card-foreground">
                        {item.content}
                      </p>

                      <p className="mt-2 text-xs text-zinc-500">
                        {formatTime(item.createdAt)}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          variant={item.likedByMe ? "default" : "outline"}
                          size="sm"
                          className="rounded-xl"
                          onClick={() => commentLikeMutation.mutate(item.id)}
                          disabled={commentLikeMutation.isPending}
                        >
                          <Heart className="mr-2 h-4 w-4" />
                          {item._count.likes}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => {
                            setReplyTargetId(
                              replyTargetId === item.id ? null : item.id,
                            );
                            setReplyText("");
                            setError("");
                          }}
                        >
                          <CornerDownRight className="mr-2 h-4 w-4" />
                          Reply
                        </Button>

                        {!isOwnComment ? (
                          <button
                            type="button"
                            className="text-xs text-zinc-500 transition hover:text-zinc-900"
                            onClick={() => promptReport("comment", item.id)}
                          >
                            Report
                          </button>
                        ) : null}

                        {canDeleteComment ? (
                          <button
                            type="button"
                            className="text-xs text-red-600 transition hover:text-red-700"
                            onClick={() => handleDeleteComment(item.id)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>

                      {replyTargetId === item.id ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 p-3">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="min-h-20 w-full resize-none border-none bg-transparent text-sm outline-none"
                          />

                          <div className="mt-3 flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => {
                                setReplyTargetId(null);
                                setReplyText("");
                              }}
                            >
                              Cancel
                            </Button>

                            <Button
                              className="rounded-xl"
                              onClick={() => handleReplySubmit(item.id)}
                              disabled={replyMutation.isPending}
                            >
                              {replyMutation.isPending ? "Posting..." : "Reply"}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {item.replies.length > 0 ? (
                        <div className="mt-4 space-y-3 border-l border-zinc-200 pl-4">
                          {item.replies.map((reply) => {
                            const isOwnReply = user?.id === reply.author.id;
                            const canDeleteReply =
                              isOwnReply || user?.id === data.author.id;

                            return (
                              <div
                                key={reply.id}
                                className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-4 text-zinc-600"
                              >
                                <div className="flex items-start gap-3">
                                  <Link
                                    to={`/profile/${reply.author.username}`}
                                  >
                                    <Avatar className="h-9 w-9">
                                      <AvatarImage
                                        src={
                                          reply.author.avatarUrl || undefined
                                        }
                                        alt={reply.author.name}
                                      />
                                      <AvatarFallback>
                                        {initials(reply.author.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Link
                                        to={`/profile/${reply.author.username}`}
                                        className="text-sm font-semibold hover:underline"
                                      >
                                        {reply.author.name}
                                      </Link>
                                      <Link
                                        to={`/profile/${reply.author.username}`}
                                        className="text-sm text-zinc-500 hover:underline"
                                      >
                                        @{reply.author.username}
                                      </Link>
                                    </div>

                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                                      {reply.content}
                                    </p>

                                    <p className="mt-2 text-xs text-zinc-500">
                                      {formatTime(reply.createdAt)}
                                    </p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <Button
                                        variant={
                                          reply.likedByMe
                                            ? "default"
                                            : "outline"
                                        }
                                        size="sm"
                                        className="rounded-xl"
                                        onClick={() =>
                                          commentLikeMutation.mutate(reply.id)
                                        }
                                        disabled={commentLikeMutation.isPending}
                                      >
                                        <Heart className="mr-2 h-4 w-4" />
                                        {reply._count.likes}
                                      </Button>

                                      {!isOwnReply ? (
                                        <button
                                          type="button"
                                          className="text-xs text-zinc-500 transition hover:text-zinc-900"
                                          onClick={() =>
                                            promptReport("comment", reply.id)
                                          }
                                        >
                                          Report
                                        </button>
                                      ) : null}

                                      {canDeleteReply ? (
                                        <button
                                          type="button"
                                          className="text-xs text-red-600 transition hover:text-red-700"
                                          onClick={() =>
                                            handleDeleteComment(reply.id)
                                          }
                                        >
                                          Delete
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-500">No comments yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
