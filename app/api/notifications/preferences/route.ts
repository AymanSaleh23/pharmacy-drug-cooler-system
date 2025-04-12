import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/notification-service"

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const authRole = cookieStore.get("auth-role")?.value

    if (!authRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use the role as the userId for simplicity
    const userId = authRole

    const preferences = await getNotificationPreferences(userId)

    if (preferences) {
      return NextResponse.json(preferences)
    } else {
      return NextResponse.json({ error: "Preferences not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("Error in get notification preferences API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies()
    const authRole = cookieStore.get("auth-role")?.value

    if (!authRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const preferences = await request.json()

    // Use the role as the userId for simplicity
    const userId = authRole

    const success = await updateNotificationPreferences(userId, preferences)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in update notification preferences API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

