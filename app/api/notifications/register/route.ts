import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { registerDeviceToken } from "@/lib/notification-service"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const authRole = cookieStore.get("auth-role")?.value

    if (!authRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Use the role as the userId for simplicity
    // In a real app, you would use a proper user ID
    const userId = authRole

    const success = await registerDeviceToken(userId, token)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to register device token" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in register device token API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

