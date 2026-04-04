import { prisma } from "../config/prisma.js"

export async function getSavedPosts(req, res) {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        post: {
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
    })

    return res.json({
      posts: bookmarks.map((item) => ({
        id: item.post.id,
        createdAt: item.post.createdAt,
        isRepost: false,
        reposter: null,
        post: {
          id: item.post.id,
          content: item.post.content,
          imageUrl: item.post.imageUrl,
          createdAt: item.post.createdAt,
          author: item.post.author,
          likedByMe: item.post.likes.length > 0,
          bookmarkedByMe: item.post.bookmarks.length > 0,
          repostedByMe: item.post.reposts.length > 0,
          _count: item.post._count,
        },
      })),
    })
  } catch (error) {
    console.error("GET_SAVED_POSTS_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}