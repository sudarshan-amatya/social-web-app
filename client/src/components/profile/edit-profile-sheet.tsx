import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { api } from "@/lib/api"
import { useAuth } from "@/context/auth-context"

type EditProfileSheetProps = {
  profile: {
    name: string
    username: string
    bio: string | null
    avatarUrl: string | null
  }
}

export function EditProfileSheet({ profile }: EditProfileSheetProps) {
  const queryClient = useQueryClient()
  const { refreshUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    name: "",
    bio: "",
  })

  useEffect(() => {
    if (open) {
      setForm({
        name: profile.name || "",
        bio: profile.bio || "",
      })
      setAvatarFile(null)
      setError("")
    }
  }, [open, profile])

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let avatarUrl = profile.avatarUrl || null

      if (avatarFile) {
        const formData = new FormData()
        formData.append("image", avatarFile)

        const uploadRes = await api.post("/uploads/image?type=avatar", formData)
        avatarUrl = uploadRes.data.imageUrl
      }

      await api.patch("/users/me", {
        name: form.name,
        bio: form.bio,
        avatarUrl,
      })
    },
    onSuccess: async () => {
      await refreshUser()
      await queryClient.invalidateQueries({ queryKey: ["profile", profile.username] })
      await queryClient.invalidateQueries({ queryKey: ["profile-posts", profile.username] })
      await queryClient.invalidateQueries({ queryKey: ["feed"] })
      await queryClient.invalidateQueries({ queryKey: ["suggested-users"] })
      setOpen(false)
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Could not update profile")
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    mutation.mutate()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-50 dark:text-black"
        >
          Edit profile
        </button>
      </SheetTrigger>

      <SheetContent className="p-5 w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Update your name, bio, and avatar image.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Name</p>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="rounded-xl"
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Avatar image</p>
            <Input
              type="file"
              accept="image/*"
              className="rounded-xl"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Bio</p>
            <Textarea
              value={form.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              className="min-h-30 rounded-xl"
              placeholder="Tell people a little about yourself"
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full rounded-xl" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}