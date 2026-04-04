import { prisma } from "../config/prisma.js"
import { getIO } from "../socket.js"

function mapConversation(conversation, currentUserId) {
  const otherParticipant = conversation.participants.find(
    (item) => item.userId !== currentUserId
  )

  return {
    id: conversation.id,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    otherUser: otherParticipant?.user || null,
    lastMessage: conversation.messages[0]
      ? {
          id: conversation.messages[0].id,
          content: conversation.messages[0].content,
          createdAt: conversation.messages[0].createdAt,
          senderId: conversation.messages[0].senderId,
          isRead: conversation.messages[0].isRead,
        }
      : null,
    unreadCount: conversation._count?.messages || 0,
  }
}

export async function getConversations(req, res) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: req.userId,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: {
                  not: req.userId,
                },
                isRead: false,
              },
            },
          },
        },
      },
    })

    return res.json({
      conversations: conversations.map((conversation) =>
        mapConversation(conversation, req.userId)
      ),
    })
  } catch (error) {
    console.error("GET_CONVERSATIONS_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function createOrGetConversation(req, res) {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ message: "Target user is required" })
    }

    if (userId === req.userId) {
      return res.status(400).json({ message: "You cannot message yourself" })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" })
    }

    const candidates = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: req.userId,
          },
        },
        AND: [
          {
            participants: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        _count: {
          select: {
            participants: true,
            messages: {
              where: {
                senderId: {
                  not: req.userId,
                },
                isRead: false,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    })

    const existingConversation = candidates.find(
      (item) => item._count.participants === 2
    )

    if (existingConversation) {
      return res.json({
        conversation: mapConversation(existingConversation, req.userId),
      })
    }

    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: req.userId }, { userId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: {
                  not: req.userId,
                },
                isRead: false,
              },
            },
          },
        },
      },
    })

    return res.status(201).json({
      conversation: mapConversation(conversation, req.userId),
    })
  } catch (error) {
    console.error("CREATE_OR_GET_CONVERSATION_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function getConversationById(req, res) {
  try {
    const { conversationId } = req.params

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: req.userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    const otherParticipant = conversation.participants.find(
      (item) => item.userId !== req.userId
    )

    return res.json({
      conversation: {
        id: conversation.id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        otherUser: otherParticipant?.user || null,
        messages: conversation.messages,
      },
    })
  } catch (error) {
    console.error("GET_CONVERSATION_BY_ID_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function sendMessage(req, res) {
  try {
    const { conversationId } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" })
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: req.userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
      },
    })

    const io = getIO()

    io.to(`conversation:${conversationId}`).emit("message:new", {
      conversationId,
      message,
    })

    for (const participant of conversation.participants) {
      io.to(`user:${participant.userId}`).emit("conversation:updated", {
        conversationId,
      })
    }

    return res.status(201).json({
      message: "Message sent successfully",
      data: message,
    })
  } catch (error) {
    console.error("SEND_MESSAGE_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function markConversationRead(req, res) {
  try {
    const { conversationId } = req.params

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: req.userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: {
          not: req.userId,
        },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    const io = getIO()

    io.to(`conversation:${conversationId}`).emit("conversation:read", {
      conversationId,
      readerId: req.userId,
    })

    for (const participant of conversation.participants) {
      io.to(`user:${participant.userId}`).emit("conversation:updated", {
        conversationId,
      })
    }

    return res.json({ message: "Conversation marked as read" })
  } catch (error) {
    console.error("MARK_CONVERSATION_READ_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}

export async function getUnreadSummary(req, res) {
  try {
    const unreadMessages = await prisma.message.count({
      where: {
        senderId: {
          not: req.userId,
        },
        isRead: false,
        conversation: {
          participants: {
            some: {
              userId: req.userId,
            },
          },
        },
      },
    })

    const unreadConversations = await prisma.conversation.count({
      where: {
        participants: {
          some: {
            userId: req.userId,
          },
        },
        messages: {
          some: {
            senderId: {
              not: req.userId,
            },
            isRead: false,
          },
        },
      },
    })

    return res.json({
      unreadMessages,
      unreadConversations,
    })
  } catch (error) {
    console.error("GET_UNREAD_SUMMARY_ERROR", error)
    return res.status(500).json({ message: "Something went wrong" })
  }
}