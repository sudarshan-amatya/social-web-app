import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/shared/post-card";
import { EditProfileSheet } from "@/components/profile/edit-profile-sheet";
import { api } from "@/lib/api";

type Profile = {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
};

type ProfileItem = {
  id: string;
  createdAt: string;
  isRepost: boolean;
  reposter: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  post: {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    likedByMe: boolean;
    bookmarkedByMe: boolean;
    repostedByMe: boolean;
    _count: {
      likes: number;
      comments: number;
      reposts: number;
    };
    author: {
      id: string;
      name: string;
      username: string;
      avatarUrl: string | null;
    };
  };
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

export function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}`);
      return res.data.profile as Profile;
    },
    enabled: Boolean(username),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["profile-posts", username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}/posts`);
      return res.data.posts as ProfileItem[];
    },
    enabled: Boolean(username),
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      await api.post(`/users/${profile.id}/follow-toggle`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", username] });
      await queryClient.invalidateQueries({ queryKey: ["suggested-users"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/bookmark-toggle`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["profile-posts", username],
      });
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.post(`/posts/${postId}/repost-toggle`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["profile-posts", username],
      });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return null;
      const res = await api.post("/messages/conversations", {
        userId: profile.id,
      });
      return res.data.conversation as { id: string };
    },
    onSuccess: (conversation) => {
      if (conversation?.id) {
        navigate(`/messages?c=${conversation.id}`);
      }
    },
  });

  if (profileLoading || !profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
        <Card className="overflow-hidden rounded-2xl border-zinc-200 shadow-sm">
          <div className="h-36 bg-zinc-200" />
          <CardContent className="p-6">
            <div className="-mt-16 space-y-4">
              <Skeleton className="h-24 w-24 rounded-full border-4 border-white" />
              <Skeleton className="h-8 w-48 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
      <Card className="overflow-hidden rounded-2xl border-zinc-200 shadow-sm">
        <div className="relative h-40 overflow-hidden bg-linear-to-br from-zinc-900 via-zinc-700 to-zinc-500">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 left-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        </div>
        <CardContent className="p-6">
          <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Avatar className="h-24 w-24 border-4 border-white">
                <AvatarImage
                  src={profile.avatarUrl || undefined}
                  alt={profile.name}
                />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>

              <div className="mt-4">
                <h1 className="text-2xl font-semibold">{profile.name}</h1>
                <p className="text-sm text-zinc-500">@{profile.username}</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-700">
                  {profile.bio || "No bio yet."}
                </p>
              </div>
            </div>

            {profile.isOwnProfile ? (
              <EditProfileSheet
                profile={{
                  name: profile.name,
                  username: profile.username,
                  bio: profile.bio,
                  avatarUrl: profile.avatarUrl,
                }}
              />
            ) : (
              <div className="flex gap-3">
                <Button
                  variant={profile.isFollowing ? "outline" : "default"}
                  className="rounded-xl"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending
                    ? "Please wait..."
                    : profile.isFollowing
                      ? "Unfollow"
                      : "Follow"}
                </Button>

                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => messageMutation.mutate()}
                  disabled={messageMutation.isPending}
                >
                  {messageMutation.isPending ? "Opening..." : "Message"}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-6 text-sm text-zinc-600">
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-300">
                {profile.followersCount}
              </span>{" "}
              followers
            </p>
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-300" >
                {profile.followingCount}
              </span>{" "}
              following
            </p>
            <p>
              <span className="font-semibold text-zinc-900 dark:text-zinc-300">
                {profile.postsCount}
              </span>{" "}
              posts
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {postsLoading ? (
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-500">Loading posts...</p>
            </CardContent>
          </Card>
        ) : posts && posts.length > 0 ? (
          posts.map((item) => (
            <PostCard
              key={item.id}
              id={item.post.id}
              name={item.post.author.name}
              username={item.post.author.username}
              content={item.post.content}
              time={formatTime(item.post.createdAt)}
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
              onToggleBookmark={() => bookmarkMutation.mutate(item.post.id)}
              onToggleRepost={() => repostMutation.mutate(item.post.id)}
            />
          ))
        ) : (
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-zinc-500">No posts yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
