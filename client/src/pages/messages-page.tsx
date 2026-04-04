import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Search, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/shared/page-header"
import { api } from "@/lib/api"
import { socket } from "@/lib/socket"
import { useAuth } from "@/context/auth-context"

type ConversationListItem = {
  id: string
  createdAt: string
  updatedAt: string
  unreadCount: number
  otherUser: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  } | null
  lastMessage: {
    id: string
    content: string
    createdAt: string
    senderId: string
    isRead: boolean
  } | null
}

type ConversationDetail = {
  id: string
  createdAt: string
  updatedAt: string
  otherUser: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
  } | null
  messages: Array<{
    id: string
    content: string
    createdAt: string
    isRead: boolean
    readAt: string | null
    sender: {
      id: string
      name: string
      username: string
      avatarUrl: string | null
    }
  }>
}

type SearchUser = {
  id: string
  name: string
  username: string
  bio: string | null
  avatarUrl: string | null
  followersCount: number
  postsCount: number
  isFollowing: boolean
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatTime(value: string) {
  return new Date(value).toLocaleString()
}

export function MessagesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedConversationId = searchParams.get("c") || ""

  const [newChatSearch, setNewChatSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [messageText, setMessageText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(newChatSearch.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [newChatSearch])

  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/messages/conversations")
      return res.data.conversations as ConversationListItem[]
    },
  })

  const { data: unreadSummary } = useQuery({
    queryKey: ["message-unread-summary"],
    queryFn: async () => {
      const res = await api.get("/messages/unread-summary")
      return res.data as { unreadMessages: number; unreadConversations: number }
    },
  })

  const { data: selectedConversation, isLoading: selectedLoading } = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: async () => {
      const res = await api.get(`/messages/conversations/${selectedConversationId}`)
      return res.data.conversation as ConversationDetail
    },
    enabled: Boolean(selectedConversationId),
  })

  const { data: searchUsers } = useQuery({
    queryKey: ["message-user-search", debouncedSearch],
    queryFn: async () => {
      const res = await api.get(`/users/search?q=${encodeURIComponent(debouncedSearch)}`)
      return res.data.users as SearchUser[]
    },
    enabled: debouncedSearch.length > 0,
  })

  const markReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await api.patch(`/messages/conversations/${conversationId}/read`)
    },
    onSuccess: async (_, conversationId) => {
      await queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] })
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      await queryClient.invalidateQueries({ queryKey: ["message-unread-summary"] })
    },
  })

  const createConversationMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await api.post("/messages/conversations", { userId: targetUserId })
      return res.data.conversation as ConversationListItem
    },
    onSuccess: async (conversation) => {
      setNewChatSearch("")
      setDebouncedSearch("")
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      setSearchParams({ c: conversation.id })
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/messages/conversations/${selectedConversationId}/messages`, {
        content: messageText,
      })
      return res.data.data
    },
    onSuccess: async () => {
      setMessageText("")
      await queryClient.invalidateQueries({ queryKey: ["conversation", selectedConversationId] })
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      await queryClient.invalidateQueries({ queryKey: ["message-unread-summary"] })
    },
  })

  useEffect(() => {
    if (!selectedConversationId) return

    socket.emit("conversation:join", selectedConversationId)

    const handleConnect = () => {
      socket.emit("conversation:join", selectedConversationId)
    }

    socket.on("connect", handleConnect)

    return () => {
      socket.emit("conversation:leave", selectedConversationId)
      socket.off("connect", handleConnect)
    }
  }, [selectedConversationId])

  useEffect(() => {
    const handleNewMessage = async (payload: {
      conversationId: string
      message: {
        sender: {
          id: string
        }
      }
    }) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      await queryClient.invalidateQueries({ queryKey: ["message-unread-summary"] })

      if (payload.conversationId === selectedConversationId) {
        await queryClient.invalidateQueries({
          queryKey: ["conversation", selectedConversationId],
        })

        if (payload.message.sender.id !== user?.id) {
          markReadMutation.mutate(payload.conversationId)
        }
      }
    }

    const handleConversationUpdated = async (payload: { conversationId: string }) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })
      await queryClient.invalidateQueries({ queryKey: ["message-unread-summary"] })

      if (payload.conversationId === selectedConversationId) {
        await queryClient.invalidateQueries({
          queryKey: ["conversation", selectedConversationId],
        })
      }
    }

    const handleConversationRead = async (payload: { conversationId: string }) => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] })

      if (payload.conversationId === selectedConversationId) {
        await queryClient.invalidateQueries({
          queryKey: ["conversation", selectedConversationId],
        })
      }
    }

    socket.on("message:new", handleNewMessage)
    socket.on("conversation:updated", handleConversationUpdated)
    socket.on("conversation:read", handleConversationRead)

    return () => {
      socket.off("message:new", handleNewMessage)
      socket.off("conversation:updated", handleConversationUpdated)
      socket.off("conversation:read", handleConversationRead)
    }
  }, [queryClient, selectedConversationId, user?.id])

  useEffect(() => {
    if (selectedConversationId) {
      markReadMutation.mutate(selectedConversationId)
    }
  }, [selectedConversationId])

  useEffect(() => {
    if (selectedConversation?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [selectedConversation?.messages?.length])

  function openConversation(id: string) {
    setSearchParams({ c: id })
  }

  function closeConversation() {
    setSearchParams({})
  }

  function handleSendMessage() {
    if (!messageText.trim()) return
    sendMessageMutation.mutate()
  }

  if (selectedConversationId) {
    return (
      <div className="mx-auto max-w-5xl pb-24 lg:pb-6">
        <div className="mb-2 flex items-center gap-3">
          <Button variant="outline" className="rounded-xl" onClick={closeConversation}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
            <p className="text-sm text-zinc-500">Real-time conversation view.</p>
          </div>
        </div>

        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardContent className="flex h-[78vh] flex-col p-0">
            {selectedLoading || !selectedConversation ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-zinc-500">Loading conversation...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage
                        src={selectedConversation.otherUser?.avatarUrl || undefined}
                        alt={selectedConversation.otherUser?.name || "User"}
                      />
                      <AvatarFallback>
                        {selectedConversation.otherUser?.name
                          ? initials(selectedConversation.otherUser.name)
                          : "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="text-sm font-semibold">
                        {selectedConversation.otherUser?.name || "Conversation"}
                      </p>
                      <Link
                        to={
                          selectedConversation.otherUser
                            ? `/profile/${selectedConversation.otherUser.username}`
                            : "/messages"
                        }
                        className="text-xs text-zinc-500 hover:underline"
                      >
                        @{selectedConversation.otherUser?.username || "user"}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 px-5 py-4 dark:bg-zinc-800">
                  {selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map((message) => {
                      const mine = message.sender.id === user?.id

                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                              mine
                                ? "bg-zinc-900 text-white"
                                : "border border-zinc-200 bg-white text-zinc-800"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`mt-2 text-[11px] ${
                                mine ? "text-zinc-300" : "text-zinc-400"
                              }`}
                            >
                              {formatTime(message.createdAt)}
                              {mine ? (message.isRead ? " · Seen" : " · Sent") : ""}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-zinc-500">No messages yet.</p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-zinc-100 bg-white p-4 dark:bg-card">
                  <div className="flex gap-3">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Write a message"
                      className="h-11 rounded-xl"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />

                    <Button
                      className="h-11 rounded-xl"
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl pb-24 lg:pb-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader
          title="Messages"
          subtitle="Choose a conversation or start a new one."
        />

        <Card className="rounded-2xl border-zinc-200 shadow-sm">
          <CardContent className="px-4 py-1">
            <p className="text-xs text-zinc-500">Unread</p>
            <p className="text-lg font-semibold">
              {unreadSummary?.unreadConversations ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardContent className="space-y-5 p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={newChatSearch}
              onChange={(e) => setNewChatSearch(e.target.value)}
              placeholder="Search users to start a new chat"
              className="h-11 rounded-xl border-zinc-200 bg-zinc-100 pl-10"
            />
          </div>

          {debouncedSearch && searchUsers && searchUsers.length > 0 ? (
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-2">
              {searchUsers.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white"
                  onClick={() => createConversationMutation.mutate(person.id)}
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={person.avatarUrl || undefined} alt={person.name} />
                    <AvatarFallback>{initials(person.name)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{person.name}</p>
                    <p className="truncate text-xs text-zinc-500">@{person.username}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            {conversationsLoading ? (
              <p className="text-sm text-zinc-500">Loading conversations...</p>
            ) : conversations && conversations.length > 0 ? (
              conversations.map((conversation) => {
                const person = conversation.otherUser

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className="cursor-pointer flex w-full items-start gap-3 rounded-2xl border border-zinc-200 px-4 py-4 text-left transition hover:bg-zinc-200 dark:hover:text-black"
                    onClick={() => openConversation(conversation.id)}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={person?.avatarUrl || undefined}
                        alt={person?.name || "User"}
                      />
                      <AvatarFallback>
                        {person?.name ? initials(person.name) : "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">
                          {person?.name || "Conversation"}
                        </p>
                        <div className="flex items-center gap-2">
                          {conversation.unreadCount > 0 ? (
                            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                          <p className="text-xs text-zinc-400">
                            {conversation.lastMessage
                              ? formatTime(conversation.lastMessage.createdAt)
                              : ""}
                          </p>
                        </div>
                      </div>

                      <p className="truncate text-xs text-zinc-500">
                        @{person?.username || "user"}
                      </p>

                      <p
                        className={`mt-2 truncate text-sm ${
                          conversation.unreadCount > 0
                            ? "font-semibold text-zinc-900"
                            : "text-zinc-600"
                        }`}
                      >
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center">
                <p className="text-base font-semibold dark:text-zinc-800">No conversations yet</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Search for a user above to start chatting.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}