import { prisma } from "../config/prisma.js"

export async function reportPost(req, res) {
  try {
    const { postId } = req.params
    const { reason, details } = req.body

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Reason is required" })
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
      },
    })

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    if (post.authorId === req.userId) {
      return res.status(400).json({ message: "You cannot report your own post" })
    }

    const existing = await prisma.report.findFirst({
      where: {
        reporterId: req.userId,
        postId,
        status: "open",
      },
    })

    if (existing) {
      return res.status(409).json({ message: "You already reported this post" })
    }

    await prisma.report.create({
      data: {
        reporterId: req.userId,
        postId,
        reason: reason.trim(),
        details: details?.trim() || null,
      },
    })

    return res.status(201).json({ message: "Post reported successfully" })
  } catch (error) {
    console.error("REPORT_POST_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function reportComment(req, res) {
  try {
    const { commentId } = req.params
    const { reason, details } = req.body

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Reason is required" })
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
      },
    })

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    if (comment.authorId === req.userId) {
      return res.status(400).json({ message: "You cannot report your own comment" })
    }

    const existing = await prisma.report.findFirst({
      where: {
        reporterId: req.userId,
        commentId,
        status: "open",
      },
    })

    if (existing) {
      return res.status(409).json({ message: "You already reported this comment" })
    }

    await prisma.report.create({
      data: {
        reporterId: req.userId,
        commentId,
        reason: reason.trim(),
        details: details?.trim() || null,
      },
    })

    return res.status(201).json({ message: "Comment reported successfully" })
  } catch (error) {
    console.error("REPORT_COMMENT_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}