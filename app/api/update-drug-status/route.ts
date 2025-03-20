import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

// This route is now only used for manual updates, as the status is checked client-side
export async function POST() {
  try {
    const { db } = await connectToDatabase()

    // Get all drugs and their associated coolers
    const drugsWithCoolers = await db
      .collection("drugs")
      .aggregate([
        {
          $lookup: {
            from: "coolingUnits",
            localField: "coolingUnitId",
            foreignField: "_id",
            as: "cooler",
          },
        },
        {
          $unwind: "$cooler",
        },
      ])
      .toArray()

    const updates = []
    const now = new Date()

    for (const drug of drugsWithCoolers) {
      // Check if the drug is expired
      const isExpired = new Date(drug.expirationDate) < now

      // Check if the drug is unusable due to temperature
      let isUnusable = false
      if (drug.temperatureExceededSince) {
        const exceededSince = new Date(drug.temperatureExceededSince)
        const hoursExceeded = (now.getTime() - exceededSince.getTime()) / (1000 * 60 * 60)
        isUnusable = hoursExceeded > drug.unsuitableTimeThreshold
      }

      // Update the drug status if needed
      if (isExpired || isUnusable) {
        updates.push({
          updateOne: {
            filter: { _id: drug._id },
            update: { $set: { unusable: true } },
          },
        })
      } 
      // else if (drug.unusable) {
      //   // Reset unusable flag if conditions no longer apply
      //   updates.push({
      //     updateOne: {
      //       filter: { _id: drug._id },
      //       update: { $set: { unusable: false } },
      //     },
      //   })
      // }
    }

    if (updates.length > 0) {
      await db.collection("drugs").bulkWrite(updates)
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} drugs`,
    })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to update drug status" }, { status: 500 })
  }
}

