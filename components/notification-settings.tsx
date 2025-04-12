"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { requestNotificationPermission } from "@/lib/firebase"
import type { NotificationPreferences } from "@/lib/notification-service"

export default function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check notification permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (typeof Notification !== "undefined") {
        setPermissionStatus(Notification.permission)
      }
    }

    checkPermission()
  }, [])

  // Fetch notification preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/notifications/preferences")

        if (response.ok) {
          const data = await response.json()
          setPreferences(data)
        } else {
          console.error("Failed to fetch notification preferences")
        }
      } catch (error) {
        console.error("Error fetching notification preferences:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  // Request notification permission and register device token
  const handleEnableNotifications = async () => {
    try {
      setIsSaving(true)
      setError(null)

      // Request permission and get FCM token
      const token = await requestNotificationPermission()

      if (!token) {
        setError("Failed to enable notifications. Please check your browser settings.")
        return
      }

      // Register the token with our backend
      const response = await fetch("/api/notifications/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        setPermissionStatus("granted")
        setSuccess("Notifications enabled successfully!")

        // Fetch updated preferences
        const prefsResponse = await fetch("/api/notifications/preferences")
        if (prefsResponse.ok) {
          const data = await prefsResponse.json()
          setPreferences(data)
        }
      } else {
        setError("Failed to register for notifications. Please try again.")
      }
    } catch (error) {
      console.error("Error enabling notifications:", error)
      setError("An error occurred while enabling notifications.")
    } finally {
      setIsSaving(false)
    }
  }

  // Update notification preferences
  const handleTogglePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      // Update local state
      setPreferences({
        ...preferences,
        [key]: value,
      })

      // Send update to server
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [key]: value,
        }),
      })

      if (response.ok) {
        setSuccess("Preferences updated successfully!")
      } else {
        setError("Failed to update preferences. Please try again.")

        // Revert local state on error
        setPreferences(preferences)
      }
    } catch (error) {
      console.error("Error updating preferences:", error)
      setError("An error occurred while updating preferences.")

      // Revert local state on error
      setPreferences(preferences)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Manage how you receive notifications from the system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {permissionStatus !== "granted" && (
          <div className="flex flex-col gap-2 p-4 border rounded-md bg-amber-50 border-amber-200">
            <div className="flex items-center gap-2">
              <BellOff className="h-5 w-5 text-amber-500" />
              <h3 className="font-medium">Notifications are disabled</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Enable notifications to receive alerts about temperature warnings, expiring drugs, and more.
            </p>
            <Button
              onClick={handleEnableNotifications}
              disabled={isSaving || permissionStatus === "denied"}
              className="mt-2"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enable Notifications
            </Button>
            {permissionStatus === "denied" && (
              <p className="text-xs text-red-500 mt-1">
                You have blocked notifications in your browser. Please update your browser settings to enable
                notifications.
              </p>
            )}
          </div>
        )}

        {permissionStatus === "granted" && preferences && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-green-500" />
              <span className="font-medium">Notifications are enabled</span>
            </div>

            <div className="space-y-4">
              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="temperature-warnings">Temperature Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts when a cooler's temperature exceeds safe levels
                  </p>
                </div>
                <Switch
                  id="temperature-warnings"
                  checked={preferences.temperatureWarnings}
                  onCheckedChange={(checked) => handleTogglePreference("temperatureWarnings", checked)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="expiration-reminders">Expiration Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified 3 months, 1 month, and 1 week before drugs expire
                  </p>
                </div>
                <Switch
                  id="expiration-reminders"
                  checked={preferences.expirationReminders}
                  onCheckedChange={(checked) => handleTogglePreference("expirationReminders", checked)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="unusable-alerts">Unusable Drug Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Be alerted when drugs become unusable due to temperature or expiration
                  </p>
                </div>
                <Switch
                  id="unusable-alerts"
                  checked={preferences.unusableAlerts}
                  onCheckedChange={(checked) => handleTogglePreference("unusableAlerts", checked)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="unavailable-alerts">Cooler Unavailability Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when a cooler becomes unavailable or unreachable
                  </p>
                </div>
                <Switch
                  id="unavailable-alerts"
                  checked={preferences.unavailableAlerts}
                  onCheckedChange={(checked) => handleTogglePreference("unavailableAlerts", checked)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

