import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    // Get all coolers
    const coolers = await db.collection("coolingUnits").find({}).toArray()

    // For each cooler, get all its drugs and their unusability state
    const result = await Promise.all(
      coolers.map(async (cooler) => {
        const drugs = await db
          .collection("drugs")
          .find({ coolingUnitId: cooler._id })
          .project({ _id: 1, name: 1, unusable: 1 })
          .toArray()

        return {
          _id: cooler._id,
          coolerModel: cooler.coolerModel,
          drugs: drugs.map((drug) => ({
            _id: drug._id,
            name: drug.name,
            unusable: drug.unusable || false,
          })),
        }
      }),
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to check unusable drugs" }, { status: 500 })
  }
}

