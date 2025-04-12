import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  checkTemperatureWarnings,
  checkExpirationWarnings,
  checkUnusableDrugs,
  checkUnavailableCoolers,
  resetNotificationFlags,
} from "@/lib/notification-check-service"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const authRole = cookieStore.get("auth-role")?.value

    // Only admins can trigger notification checks
    if (authRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Run all checks
    await checkTemperatureWarnings()
    await checkExpirationWarnings()
    await checkUnusableDrugs()
    await checkUnavailableCoolers()
    await resetNotificationFlags()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in notification check API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

