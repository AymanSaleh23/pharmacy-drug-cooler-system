"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import NotificationSettings from "@/components/notification-settings"
import Header from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import ProtectedRoute from "@/app/protected-route"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("notifications")
  const { isAdmin } = useAuth()

  return (
    <ProtectedRoute>
      <Header />
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            {/* Add more tabs here as needed */}
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettings />
          </TabsContent>

          {/* Add more tab content here as needed */}
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}

