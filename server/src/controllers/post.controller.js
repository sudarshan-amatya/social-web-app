import { prisma } from "../config/prisma.js";

function buildFeedWhere(cursorCreatedAt, cursorId) {
  if (!cursorCreatedAt || !cursorId) return undefined;

  const createdAt = new Date(cursorCreatedAt);
  if (Number.isNaN(createdAt.getTime())) return undefined;

  return {
    OR: [
      {
        createdAt: {
          lt: createdAt,
        },
      },
      {
        AND: [
          {
            createdAt,
          },
          {
            id: {
              lt: cursorId,
            },
          },
        ],
      },
    ],
  };
}

function extractHashtags(text = "") {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || []

  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()).filter(Boolean))].slice(0, 10)
}

async function syncPostTags(postId, content) {
  const hashtags = extractHashtags(content)

  await prisma.postTag.deleteMany({
    where: { postId },
  })

  if (!hashtags.length) return

  const tags = await Promise.all(
    hashtags.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  )

  await prisma.postTag.createMany({
    data: tags.map((tag) => ({
      postId,
      tagId: tag.id,
    })),
    skipDuplicates: true,
  })
}

function buildFeedFilter(cursorCreatedAt, cursorId, tag, feedType, currentUserId) {
  const filters = []

  const cursorFilter = buildFeedWhere(cursorCreatedAt, cursorId)
  if (cursorFilter) filters.push(cursorFilter)

  if (tag) {
    filters.push({
      tags: {
        some: {
          tag: {
            name: tag.toLowerCase(),
          },
        },
      },
    })
  }

  if (feedType === "following") {
    filters.push({
      author: {
        followers: {
          some: {
            followerId: currentUserId,
          },
        },
      },
    })
  }

  return filters.length ? { AND: filters } : undefined
}

function basePostInclude(currentUserId) {
  return {
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
        userId: currentUserId,
      },
      select: {
        id: true,
      },
    },
    bookmarks: {
      where: {
        userId: currentUserId,
      },
      select: {
        id: true,
      },
    },
    reposts: {
      where: {
        authorId: currentUserId,
      },
      select: {
        id: true,
      },
    },
  };
}

function feedPostInclude(currentUserId) {
  return {
    ...basePostInclude(currentUserId),
    repostOf: {
      include: {
        ...basePostInclude(currentUserId),
      },
    },
  };
}

function mapFeedItem(post) {
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
}

async function getCanonicalPost(postId) {
  const found = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      repostOfId: true,
    },
  });

  if (!found) return null;

  const canonicalId = found.repostOfId ?? found.id;

  return prisma.post.findUnique({
    where: { id: canonicalId },
    select: {
      id: true,
      authorId: true,
      repostOfId: true,
    },
  });
}

export async function createPost(req, res) {
  try {
    const { content, imageUrl } = req.body

    if ((!content || !content.trim()) && !imageUrl) {
      return res.status(400).json({ message: "Post content or image is required" })
    }

    const createdPost = await prisma.post.create({
      data: {
        content: content?.trim() || "",
        imageUrl: imageUrl?.trim() || null,
        authorId: req.userId,
      },
    })

    await syncPostTags(createdPost.id, createdPost.content)

    const post = await prisma.post.findUnique({
      where: { id: createdPost.id },
      include: feedPostInclude(req.userId),
    })

    return res.status(201).json({
      message: "Post created successfully",
      post: mapFeedItem(post),
    })
  } catch (error) {
    console.error("CREATE_POST_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function getFeedPosts(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20)
    const cursorCreatedAt = req.query.cursorCreatedAt
    const cursorId = req.query.cursorId
    const tag = String(req.query.tag || "").trim()
    const feedType = String(req.query.feedType || "for-you").trim()

    const posts = await prisma.post.findMany({
      where: buildFeedFilter(cursorCreatedAt, cursorId, tag, feedType, req.userId),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: feedPostInclude(req.userId),
    })

    const hasMore = posts.length > limit
    const visiblePosts = hasMore ? posts.slice(0, limit) : posts
    const lastPost = hasMore ? visiblePosts[visiblePosts.length - 1] : null

    return res.json({
      posts: visiblePosts.map(mapFeedItem),
      nextCursor: lastPost
        ? {
            id: lastPost.id,
            createdAt: lastPost.createdAt.toISOString(),
          }
        : null,
    })
  } catch (error) {
    console.error("GET_FEED_POSTS_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function getPostById(req, res) {
  try {
    const canonicalPost = await getCanonicalPost(req.params.postId);

    if (!canonicalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const post = await prisma.post.findUnique({
      where: { id: canonicalPost.id },
      include: {
        ...basePostInclude(req.userId),
        comments: {
          where: {
            parentId: null,
          },
          orderBy: {
            createdAt: "asc",
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
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
            _count: {
              select: {
                likes: true,
                replies: true,
              },
            },
            replies: {
              orderBy: {
                createdAt: "asc",
              },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatarUrl: true,
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
                _count: {
                  select: {
                    likes: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.json({
      post: {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        author: post.author,
        likedByMe: post.likes.length > 0,
        bookmarkedByMe: post.bookmarks.length > 0,
        repostedByMe: post.reposts.length > 0,
        _count: post._count,
        comments: post.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: comment.author,
          likedByMe: comment.likes.length > 0,
          _count: {
            likes: comment._count.likes,
            replies: comment._count.replies,
          },
          replies: comment.replies.map((reply) => ({
            id: reply.id,
            content: reply.content,
            createdAt: reply.createdAt,
            author: reply.author,
            likedByMe: reply.likes.length > 0,
            _count: {
              likes: reply._count.likes,
            },
          })),
        })),
      },
    });
  } catch (error) {
    console.error("GET_POST_BY_ID_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
export async function updatePost(req, res) {
  try {
    const { postId } = req.params
    const { content, imageUrl } = req.body

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        repostOfId: true,
      },
    })

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" })
    }

    if (existingPost.authorId !== req.userId) {
      return res.status(403).json({ message: "You can only edit your own posts" })
    }

    if (existingPost.repostOfId) {
      return res.status(400).json({ message: "Reposts cannot be edited" })
    }

    if ((!content || !content.trim()) && !imageUrl) {
      return res.status(400).json({ message: "Post content or image is required" })
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        content: content?.trim() || "",
        imageUrl: imageUrl || null,
      },
    })

    await syncPostTags(updatedPost.id, updatedPost.content)

    const post = await prisma.post.findUnique({
      where: { id: updatedPost.id },
      include: feedPostInclude(req.userId),
    })

    return res.json({
      message: "Post updated successfully",
      post: mapFeedItem(post),
    })
  } catch (error) {
    console.error("UPDATE_POST_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function deletePost(req, res) {
  try {
    const { postId } = req.params;

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (existingPost.authorId !== req.userId) {
      return res
        .status(403)
        .json({ message: "You can only delete your own posts" });
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("DELETE_POST_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function addComment(req, res) {
  try {
    const canonicalPost = await getCanonicalPost(req.params.postId);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    if (!canonicalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId: canonicalPost.id,
        authorId: req.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (canonicalPost.authorId !== req.userId) {
      await prisma.notification.create({
        data: {
          type: "comment",
          recipientId: canonicalPost.authorId,
          actorId: req.userId,
          postId: canonicalPost.id,
        },
      });
    }

    return res.status(201).json({
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("ADD_COMMENT_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function toggleLike(req, res) {
  try {
    const canonicalPost = await getCanonicalPost(req.params.postId);

    if (!canonicalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: req.userId,
          postId: canonicalPost.id,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: req.userId,
            postId: canonicalPost.id,
          },
        },
      });

      await prisma.notification.deleteMany({
        where: {
          type: "like",
          recipientId: canonicalPost.authorId,
          actorId: req.userId,
          postId: canonicalPost.id,
        },
      });

      return res.json({ message: "Post unliked", likedByMe: false });
    }

    await prisma.like.create({
      data: {
        userId: req.userId,
        postId: canonicalPost.id,
      },
    });

    if (canonicalPost.authorId !== req.userId) {
      await prisma.notification.create({
        data: {
          type: "like",
          recipientId: canonicalPost.authorId,
          actorId: req.userId,
          postId: canonicalPost.id,
        },
      });
    }

    return res.json({ message: "Post liked", likedByMe: true });
  } catch (error) {
    console.error("TOGGLE_LIKE_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function toggleBookmark(req, res) {
  try {
    const canonicalPost = await getCanonicalPost(req.params.postId);

    if (!canonicalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: req.userId,
          postId: canonicalPost.id,
        },
      },
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          userId_postId: {
            userId: req.userId,
            postId: canonicalPost.id,
          },
        },
      });

      return res.json({
        message: "Post removed from saved",
        bookmarkedByMe: false,
      });
    }

    await prisma.bookmark.create({
      data: {
        userId: req.userId,
        postId: canonicalPost.id,
      },
    });

    return res.json({
      message: "Post saved",
      bookmarkedByMe: true,
    });
  } catch (error) {
    console.error("TOGGLE_BOOKMARK_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}

export async function toggleRepost(req, res) {
  try {
    const canonicalPost = await getCanonicalPost(req.params.postId);

    if (!canonicalPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (canonicalPost.authorId === req.userId) {
      return res
        .status(400)
        .json({ message: "You cannot repost your own post" });
    }

    const existingRepost = await prisma.post.findFirst({
      where: {
        authorId: req.userId,
        repostOfId: canonicalPost.id,
      },
      select: {
        id: true,
      },
    });

    if (existingRepost) {
      await prisma.post.delete({
        where: {
          id: existingRepost.id,
        },
      });

      await prisma.notification.deleteMany({
        where: {
          type: "repost",
          recipientId: canonicalPost.authorId,
          actorId: req.userId,
          postId: canonicalPost.id,
        },
      });

      return res.json({
        message: "Repost removed",
        repostedByMe: false,
      });
    }

    await prisma.post.create({
      data: {
        authorId: req.userId,
        content: "",
        imageUrl: null,
        repostOfId: canonicalPost.id,
      },
    });

    await prisma.notification.create({
      data: {
        type: "repost",
        recipientId: canonicalPost.authorId,
        actorId: req.userId,
        postId: canonicalPost.id,
      },
    });

    return res.json({
      message: "Post reposted",
      repostedByMe: true,
    });
  } catch (error) {
    console.error("TOGGLE_REPOST_ERROR", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}
