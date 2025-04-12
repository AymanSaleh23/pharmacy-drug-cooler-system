import { NextResponse } from "next/server";
import {
  checkTemperatureWarnings,
  checkExpirationWarnings,
  checkUnusableDrugs,
  checkUnavailableCoolers,
  resetNotificationFlags
} from "@/lib/notification-check-service";

// This endpoint will be called by Vercel Cron
export async function GET() {
  try {
    // Run all checks
    await checkTemperatureWarnings();
    await checkExpirationWarnings();
    await checkUnusableDrugs();
    await checkUnavailableCoolers();
    await resetNotificationFlags();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in cron notification check:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Configure in vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/cron/check-notifications",
//       "schedule": "*/15 * * * *"
//     }
//   ]
// }