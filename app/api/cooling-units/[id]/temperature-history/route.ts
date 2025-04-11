import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"
import { cookies } from "next/headers"

function isAdmin(request: Request) {
  const cookieStore = cookies()
  const authRole = cookieStore.get("auth-role")?.value
  return authRole === "admin"
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase();

    // Get the URL search params to determine time range
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("days") || "7";

    // Calculate time range
    const endDate = new Date();
    const startDate = new Date();

    if (range.startsWith("0m")) {
      // Last X Minutes
      const minutes = parseInt(range.slice(2), 10);
      startDate.setMinutes(endDate.getMinutes() - minutes);
    } else if (range.startsWith("0H")) {
      // Last X Hours
      const hours = parseInt(range.slice(2), 10);
      startDate.setHours(endDate.getHours() - hours);
    } else {
      // Default to last X days
      const days = parseInt(range, 10);
      startDate.setDate(endDate.getDate() - days);
    }

    // Query temperature history
    const temperatureHistory = await db
      .collection("temperatureHistory")
      .find({
        coolingUnitId: new ObjectId(params.id),
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: 1 })
      .toArray();

    return NextResponse.json(temperatureHistory);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to fetch temperature history" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // Check if user is admin
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { db } = await connectToDatabase()
    const { temperature } = await request.json()

    // Create a new temperature record
    const record = {
      coolingUnitId: new ObjectId(params.id),
      temperature,
      timestamp: new Date(),
    }

    await db.collection("temperatureHistory").insertOne(record)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to save temperature record" }, { status: 500 })
  }
}

