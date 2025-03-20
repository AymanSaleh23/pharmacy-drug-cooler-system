import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const data = await request.json()

    // Check if the cooling unit exists
    const coolingUnit = await db.collection("coolingUnits").findOne({ _id: new ObjectId(params.id) })

    if (!coolingUnit) {
      return NextResponse.json({ error: "Cooling unit not found" }, { status: 404 })
    }

    // Add the cooling unit ID to the drug data
    const drugData = {
      ...data,
      coolingUnitId: new ObjectId(params.id),
      createdAt: new Date(),
    }

    const result = await db.collection("drugs").insertOne(drugData)

    const newDrug = await db.collection("drugs").findOne({ _id: result.insertedId })

    return NextResponse.json(newDrug, { status: 201 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to add drug" }, { status: 500 })
  }
}

