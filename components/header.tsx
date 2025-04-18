"use client"

import Link from "next/link"
import { LogOut, User, Shield, Bell, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import { requestNotificationPermission } from "@/lib/firebase"

export default function Header() {
  const { logout, isAdmin, role } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    // Check if notifications are enabled
    if (typeof Notification !== "undefined") {
      setNotificationsEnabled(Notification.permission === "granted")
    }
  }, [])

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission()

    if (token) {
      // Register the token with our backend
      await fetch("/api/notifications/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      setNotificationsEnabled(true)
    }
  }

  if (!role) return null

  return (
    <header className="border-b">
      <div className="container mx-auto py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Pharmacy Drug Cooler System
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isAdmin ? <Shield className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-gray-600" />}
            <span className="font-medium">{isAdmin ? "Admin" : "User"}</span>
          </div>

          {!notificationsEnabled ? (
            <Button variant="outline" size="sm" onClick={handleEnableNotifications}>
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}