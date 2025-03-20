import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

// Update the GET method to return all coolers with availability state
export async function GET() {
  try {
    const { db } = await connectToDatabase()

    const coolers = await db
      .collection("coolingUnits")
      .find(
        {},
        {
          projection: {
            _id: 1,
            coolerModel: 1,
            availability: 1,
          },
        },
      )
      .toArray()

    return NextResponse.json(coolers)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to check availability" }, { status: 500 })
  }
}

