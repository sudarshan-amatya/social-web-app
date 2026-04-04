import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";

type NotificationItem = {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
  };
  post: {
    id: string;
    content: string;
  } | null;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function getNotificationText(item: NotificationItem) {
  if (item.type === "follow") {
    return "started following you.";
  }

  if (item.type === "like") {
    return "liked your post.";
  }

  if (item.type === "comment") {
    return "commented on your post.";
  }

  if (item.type === "repost") {
    return "reposted your post.";
  }

  if (item.type === "comment_like") {
    return "liked your comment.";
  }

  if (item.type === "comment_reply") {
    return "replied to your comment.";
  }

  return "interacted with you.";
}

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data.notifications as NotificationItem[];
    },
  });
  const markOneReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await api.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications-unread-summary"],
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications-unread-summary"],
      });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Notifications"
          subtitle="Track follows, likes, and comments in one place."
        />

        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          {markAllReadMutation.isPending ? "Updating..." : "Mark all read"}
        </Button>
      </div>

      {isLoading ? (
        <>
          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : data && data.length > 0 ? (
        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardContent className="divide-y divide-zinc-100 p-0">
            {data.map((item) => {
              const initials = item.actor.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const targetLink =
                item.type === "follow"
                  ? `/profile/${item.actor.username}`
                  : item.post
                    ? `/post/${item.post.id}`
                    : `/profile/${item.actor.username}`;

              return (
                <Link
                  key={item.id}
                  to={targetLink}
                  className="flex items-start gap-3 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-700  "
                  onClick={() => {
                    if (!item.isRead) {
                      markOneReadMutation.mutate(item.id);
                    }
                  }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={item.actor.avatarUrl || undefined}
                      alt={item.actor.name}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-700 dark:text-zinc-400 ">
                      <span className="font-semibold">{item.actor.name}</span>{" "}
                      {getNotificationText(item)}
                    </p>

                    {item.post ? (
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {item.post.content}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs text-zinc-400">
                      {formatTime(item.createdAt)}
                    </p>
                  </div>

                  {!item.isRead ? (
                    <div className="mt-2 h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                  ) : null}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">No notifications yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
