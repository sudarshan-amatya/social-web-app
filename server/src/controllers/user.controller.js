import { prisma } from "../config/prisma.js";

function mapPost(post) {
  return {
    ...post,
    likedByMe: post.likes.length > 0,
  };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function updateMyProfile(req, res) {
  try {
    const { name, bio, avatarUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: name.trim(),
        bio: bio?.trim() || null,
        avatarUrl: avatarUrl?.trim() || null,
      },
    });

    return res.json({
      message: "Profile updated successfully",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("UPDATE_PROFILE_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getProfile(req, res) {
  try {
    const username = req.params.username.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
        followers: {
          where: {
            followerId: req.userId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      profile: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        postsCount: user._count.posts,
        isFollowing: user.followers.length > 0,
        isOwnProfile: user.id === req.userId,
      },
    });
  } catch (error) {
    console.error("GET_PROFILE_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getUserPosts(req, res) {
  try {
    const username = req.params.username.trim().toLowerCase();

    const posts = await prisma.post.findMany({
      where: {
        author: {
          username,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
        likes: {
          where: {
            userId: req.userId,
          },
          select: {
            id: true,
          },
        },
        bookmarks: {
          where: {
            userId: req.userId,
          },
          select: {
            id: true,
          },
        },
        reposts: {
          where: {
            authorId: req.userId,
          },
          select: {
            id: true,
          },
        },
        repostOf: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                reposts: true,
              },
            },
            likes: {
              where: {
                userId: req.userId,
              },
              select: {
                id: true,
              },
            },
            bookmarks: {
              where: {
                userId: req.userId,
              },
              select: {
                id: true,
              },
            },
            reposts: {
              where: {
                authorId: req.userId,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      posts: posts.map((post) => {
        const target = post.repostOf ?? post;

        return {
          id: post.id,
          createdAt: post.createdAt,
          isRepost: Boolean(post.repostOf),
          reposter: post.repostOf
            ? {
                id: post.author.id,
                name: post.author.name,
                username: post.author.username,
                avatarUrl: post.author.avatarUrl,
              }
            : null,
          post: {
            id: target.id,
            content: target.content,
            imageUrl: target.imageUrl,
            createdAt: target.createdAt,
            author: target.author,
            likedByMe: target.likes.length > 0,
            bookmarkedByMe: target.bookmarks.length > 0,
            repostedByMe: target.reposts.length > 0,
            _count: target._count,
          },
        };
      }),
    });
  } catch (error) {
    console.error("GET_USER_POSTS_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function toggleFollow(req, res) {
  try {
    const { userId } = req.params;

    if (userId === req.userId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.userId,
          followingId: userId,
        },
      },
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: req.userId,
            followingId: userId,
          },
        },
      });

      await prisma.notification.deleteMany({
        where: {
          type: "follow",
          recipientId: userId,
          actorId: req.userId,
        },
      });

      return res.json({
        message: "Unfollowed user",
        isFollowing: false,
      });
    }

    await prisma.follow.create({
      data: {
        followerId: req.userId,
        followingId: userId,
      },
    });

    await prisma.notification.create({
      data: {
        type: "follow",
        recipientId: userId,
        actorId: req.userId,
      },
    });

    return res.json({
      message: "Followed user",
      isFollowing: true,
    });
  } catch (error) {
    console.error("TOGGLE_FOLLOW_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function getSuggestedUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: req.userId,
        },
        followers: {
          none: {
            followerId: req.userId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      include: {
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    return res.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        followersCount: user._count.followers,
      })),
    });
  } catch (error) {
    console.error("GET_SUGGESTED_USERS_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
export async function searchUsers(req, res) {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: req.userId,
        },
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            username: {
              contains: query.toLowerCase(),
              mode: "insensitive",
            },
          },
        ],
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
        followers: {
          where: {
            followerId: req.userId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    return res.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        followersCount: user._count.followers,
        postsCount: user._count.posts,
        isFollowing: user.followers.length > 0,
      })),
    });
  } catch (error) {
    console.error("SEARCH_USERS_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
