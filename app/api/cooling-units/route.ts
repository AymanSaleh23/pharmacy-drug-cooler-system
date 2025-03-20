import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    const coolingUnits = await db
      .collection("coolingUnits")
      .aggregate([
        {
          $lookup: {
            from: "drugs",
            localField: "_id",
            foreignField: "coolingUnitId",
            as: "drugs",
          },
        },
        {
          $addFields: {
            unusableDrugsCount: {
              $size: {
                $filter: {
                  input: "$drugs",
                  as: "drug",
                  cond: {
                    $and: [
                      { $eq: ["$$drug.unusable", true] },
                      {
                        $or: [
                          { $eq: [{ $type: "$$drug.temperatureExceededSince" }, "missing"] },
                          { $eq: ["$$drug.temperatureExceededSince", null] },
                          {
                            $gt: [
                              {
                                $divide: [
                                  { $subtract: [new Date(), "$$drug.temperatureExceededSince"] },
                                  3600000, // Convert ms to hours
                                ],
                              },
                              "$$drug.unsuitableTimeThreshold",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
            expiringDrugsCount: {
              $size: {
                $filter: {
                  input: "$drugs",
                  as: "drug",
                  cond: { $lt: ["$$drug.expirationDate", new Date()] },
                },
              },
            },
            totalDrugsCount: { $size: "$drugs" },
          },
        },
      ])
      .toArray()

    return NextResponse.json(coolingUnits)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch cooling units" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase()
    const data = await request.json()

    // Add lastUpdatedTemperature field when creating a new cooler
    const coolerData = {
      ...data,
      lastUpdatedTemperature: new Date(),
    }

    const result = await db.collection("coolingUnits").insertOne(coolerData)

    const newCooler = await db.collection("coolingUnits").findOne({ _id: result.insertedId })

    return NextResponse.json(newCooler, { status: 201 })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to create cooling unit" }, { status: 500 })
  }
}

