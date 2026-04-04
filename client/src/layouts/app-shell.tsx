import { Outlet } from "react-router-dom"
import { AppSidebar } from "@/components/navigation/app-sidebar"
import { MobileNav } from "@/components/navigation/mobile-nav"
import { RightSidebar } from "@/components/shared/right-sidebar"

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 lg:px-6">
        <aside className="sticky top-6 hidden h-fit w-64 shrink-0 lg:block">
          <AppSidebar />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>

        <aside className="sticky top-6 hidden h-fit w-80 shrink-0 xl:block">
          <RightSidebar />
        </aside>
      </div>

      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  )
}