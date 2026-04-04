import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Repeat2, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

type PostCardProps = {
  id: string;
  name: string;
  username: string;
  content: string;
  time: string;
  likesCount?: number;
  commentsCount?: number;
  repostsCount?: number;
  likedByMe?: boolean;
  bookmarkedByMe?: boolean;
  repostedByMe?: boolean;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  repostedBy?: {
    name: string;
    username: string;
  } | null;
  onToggleLike?: () => void;
  onToggleBookmark?: () => void;
  onToggleRepost?: () => void;
};

export function PostCard({
  id,
  name,
  username,
  content,
  time,
  likesCount = 0,
  commentsCount = 0,
  repostsCount = 0,
  likedByMe = false,
  bookmarkedByMe = false,
  repostedByMe = false,
  avatarUrl,
  imageUrl,
  repostedBy,
  onToggleLike,
  onToggleBookmark,
  onToggleRepost,
}: PostCardProps) {
  const navigate = useNavigate();

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card
      className="cursor-pointer rounded-2xl border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      onClick={() => navigate(`/post/${id}`)}
    >
      <CardContent className="p-5">
        {repostedBy ? (
          <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              className="font-medium hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${repostedBy.username}`);
              }}
            >
              {repostedBy.name}
            </button>{" "}
            reposted
          </div>
        ) : null}

        <div className="flex items-start gap-3">
          <Link
            to={`/profile/${username}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <Avatar className="h-11 w-11">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/profile/${username}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {name}
              </Link>

              <Link
                to={`/profile/${username}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
              >
                @{username}
              </Link>

              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{time}</p>
            </div>

            {content ? (
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-zinc-800 dark:text-zinc-100">
                {content}
              </p>
            ) : null}

            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Post"
                className="mt-4 max-h-105 w-full rounded-2xl border border-zinc-200 object-cover dark:border-zinc-800"
              />
            ) : null}

            <div className="mt-4 flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  likedByMe
                    ? "bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
                    : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike?.();
                }}
              >
                <Heart className="h-4 w-4" />
                {likesCount}
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/post/${id}`);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {commentsCount}
              </button>

              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  repostedByMe
                    ? "bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
                    : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRepost?.();
                }}
              >
                <Repeat2 className="h-4 w-4" />
                {repostsCount}
              </button>

              <button
                type="button"
                className={`ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  bookmarkedByMe
                    ? "bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-100"
                    : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark?.();
                }}
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
