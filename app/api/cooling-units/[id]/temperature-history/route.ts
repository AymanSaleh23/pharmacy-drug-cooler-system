import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()

    // Get the URL search params to determine time range
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "7", 10)

    // Calculate the date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Query temperature history for the specified cooler and time range
    const temperatureHistory = await db
      .collection("temperatureHistory")
      .find({
        coolingUnitId: new ObjectId(params.id),
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: 1 })
      .toArray()

    return NextResponse.json(temperatureHistory)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch temperature history" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
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

