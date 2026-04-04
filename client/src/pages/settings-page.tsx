import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"

type ThemeMode = "light" | "dark"

export function SettingsPage() {
  const [theme, setTheme] = useState<ThemeMode>("light")

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme-mode") as ThemeMode | null) || "light"
    setTheme(savedTheme)

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  function applyTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme)
    localStorage.setItem("theme-mode", nextTheme)

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24 lg:pb-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your appearance preferences."
      />

      <Card className="rounded-2xl border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-500">
            Choose how Social Web looks for you.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => applyTheme("light")}
            >
              <Sun className="mr-2 h-4 w-4" />
              Light
            </Button>

            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => applyTheme("dark")}
            >
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}