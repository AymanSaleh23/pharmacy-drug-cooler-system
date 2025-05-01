import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  checkTemperatureWarnings,
  checkExpirationWarnings,
  checkUnusableDrugs,
  checkUnavailableCoolers,
  resetNotificationFlags,
  checkTemperatureBatteryWarning,
} from "@/lib/notification-check-service"


export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const { debug } = await request.json();

    const authRole = await cookieStore.get("auth-role")?.value
    if (authRole !== undefined) {

      // Run all checks
      await checkTemperatureWarnings(debug)
      await checkTemperatureBatteryWarning(debug)
      await checkExpirationWarnings(debug)
      await checkUnusableDrugs(debug)
      await checkUnavailableCoolers(debug)
      await resetNotificationFlags()

      return NextResponse.json({ success: true })
    }
    else {
      return NextResponse.json({ success: false, message: "un-Auth" })
    }

  } catch (error) {
    console.error("Error in notification check API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
