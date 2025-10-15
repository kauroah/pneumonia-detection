"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Activity,
  Users,
  TrendingUp,
  Calendar,
  User,
  LogOut,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Home,
} from "lucide-react"

interface SidebarNavProps {
  userName?: string
}

export function SidebarNav({ userName }: SidebarNavProps) {
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const navItems = [
    { icon: Home, label: "Главная", path: "/dashboard" },
    { icon: Users, label: "Пациенты", path: "/patients" },
    { icon: Activity, label: "История", path: "/history" },
    { icon: TrendingUp, label: "Статистика", path: "/statistics" },
    { icon: Calendar, label: "Приемы", path: "/follow-ups" },
    { icon: MessageSquare, label: "Консультация", path: "/second-opinions" },
    { icon: User, label: "Профиль", path: "/profile" },
  ]

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Диагностика</h2>
              <p className="text-xs text-muted-foreground">Пневмония</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("h-8 w-8", collapsed && "mx-auto")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path
          return (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10",
                collapsed && "justify-center px-2",
                isActive && "bg-primary/10 text-primary hover:bg-primary/20",
              )}
              onClick={() => router.push(item.path)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Button>
          )
        })}
      </nav>

      <div className="p-2 border-t space-y-1">
        {!collapsed && userName && (
          <div className="px-3 py-2 text-sm">
            <p className="font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">Врач</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-10 text-destructive hover:text-destructive",
            collapsed && "justify-center px-2",
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Выход</span>}
        </Button>
      </div>
    </div>
  )
}
