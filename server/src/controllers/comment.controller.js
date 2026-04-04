import { prisma } from "../config/prisma.js"

export async function addCommentReply(req, res) {
  try {
    const { commentId } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Reply content is required" })
    }

    const parentComment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        postId: true,
        authorId: true,
      },
    })

    if (!parentComment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    const reply = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId: parentComment.postId,
        parentId: parentComment.id,
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
    })

    if (parentComment.authorId !== req.userId) {
      await prisma.notification.create({
        data: {
          type: "comment_reply",
          recipientId: parentComment.authorId,
          actorId: req.userId,
          postId: parentComment.postId,
        },
      })
    }

    return res.status(201).json({
      message: "Reply added successfully",
      reply,
    })
  } catch (error) {
    console.error("ADD_COMMENT_REPLY_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function toggleCommentLike(req, res) {
  try {
    const { commentId } = req.params

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        postId: true,
      },
    })

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: req.userId,
          commentId,
        },
      },
    })

    if (existingLike) {
      await prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId: req.userId,
            commentId,
          },
        },
      })

      await prisma.notification.deleteMany({
        where: {
          type: "comment_like",
          recipientId: comment.authorId,
          actorId: req.userId,
          postId: comment.postId,
        },
      })

      return res.json({
        message: "Comment unliked",
        likedByMe: false,
      })
    }

    await prisma.commentLike.create({
      data: {
        userId: req.userId,
        commentId,
      },
    })

    if (comment.authorId !== req.userId) {
      await prisma.notification.create({
        data: {
          type: "comment_like",
          recipientId: comment.authorId,
          actorId: req.userId,
          postId: comment.postId,
        },
      })
    }

    return res.json({
      message: "Comment liked",
      likedByMe: true,
    })
  } catch (error) {
    console.error("TOGGLE_COMMENT_LIKE_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function deleteComment(req, res) {
  try {
    const { commentId } = req.params

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: {
            id: true,
            authorId: true,
          },
        },
      },
    })

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    const isCommentOwner = comment.authorId === req.userId
    const isPostOwner = comment.post.authorId === req.userId

    if (!isCommentOwner && !isPostOwner) {
      return res.status(403).json({ message: "You cannot delete this comment" })
    }

    await prisma.comment.delete({
      where: { id: commentId },
    })

    return res.json({ message: "Comment deleted successfully" })
  } catch (error) {
    console.error("DELETE_COMMENT_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}