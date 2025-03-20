import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    // Get all coolers
    const coolers = await db.collection("coolingUnits").find({}).toArray()

    // For each cooler, get all its drugs and determine if they're expired or expiring soon
    const result = await Promise.all(
      coolers.map(async (cooler) => {
        const drugs = await db
          .collection("drugs")
          .find({ coolingUnitId: cooler._id })
          .project({ _id: 1, name: 1, expirationDate: 1 })
          .toArray()

        const today = new Date()
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

        return {
          _id: cooler._id,
          coolerModel: cooler.coolerModel,
          drugs: drugs.map((drug) => {
            const expirationDate = new Date(drug.expirationDate)
            return {
              _id: drug._id,
              name: drug.name,
              expirationDate: drug.expirationDate,
              isExpired: expirationDate < today,
              isExpiringSoon: expirationDate >= today && expirationDate <= thirtyDaysFromNow,
            }
          }),
        }
      }),
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to check expiration" }, { status: 500 })
  }
}

