import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase();

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
            unusableDrugsFlag: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$drugs",
                      as: "drug",
                      cond: {
                        $eq: ["$$drug.unusable", true],
                      },
                    },
                  },
                },
                0,
              ],
            },
            ExpiredDrugsFlag: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$drugs",
                      as: "drug",
                      cond: {
                        $lt: ["$$drug.expirationDate", new Date()],
                      },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            coolerModel: 1,
            availability: 1,
            disabled: 1,
            temperatureWarning: 1,
            batteryLevel: 1,
            batteryWarning: 1,
            unusableDrugsFlag: 1,
            ExpiredDrugsFlag: 1,
          },
        },
      ])
      .toArray();

    return NextResponse.json(coolingUnits);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch summarized cooling units" },
      { status: 500 }
    );
  }
}
