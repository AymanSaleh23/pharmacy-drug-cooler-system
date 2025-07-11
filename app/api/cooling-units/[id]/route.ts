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
    const { db } = await connectToDatabase()

    const coolingUnit = await db
      .collection("coolingUnits")
      .aggregate([
        {
          $match: { _id: new ObjectId(params.id) },
        },
        {
          $lookup: {
            from: "drugs",
            localField: "_id",
            foreignField: "coolingUnitId",
            as: "drugs",
          },
        },
      ])
      .next()

    if (!coolingUnit) {
      return NextResponse.json({ error: "Cooling unit not found" }, { status: 404 })
    }

    return NextResponse.json(coolingUnit)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch cooling unit" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {

  try {
    const { db } = await connectToDatabase()
    const data = await request.json()
    const receivedID = await params.id
    let { title, body } = data;
    // Prepare data to send in the request
    let payload = { title, body };

    // If temperature is being updated, add lastUpdatedTemperature and save to history
    if (data.currentTemperature !== undefined) {
      data.lastUpdatedTemperature = new Date()

      // Save temperature to history
      await db.collection("temperatureHistory").insertOne({
        coolingUnitId: new ObjectId(receivedID),
        temperature: data.currentTemperature,
        timestamp: new Date(),
      })
    }
    // Get the current cooling unit to check if we need to update drug temperature status
    const currentCooler = await db.collection("coolingUnits").findOne({ _id: new ObjectId(receivedID) })
    if (currentCooler && data.availability === false) {
      console.log(`Live Availability Alert: ${currentCooler.coolerModel, currentCooler.address}`);
      payload = {
        title: `Live Alert!`,
        body: `Cooler Unit: is not Available!\nModel:${currentCooler.coolerModel}\nVendor:${currentCooler.vendor}\nAddress:${currentCooler.address}`
      }
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });
      console.log(`Availability Alert notification response: ${receivedID}\n ${response}`); 
    }

  
    if (currentCooler && data.batteryWarning === true) {
      console.log(`Live Battery Warning: ${receivedID}`);
      payload = {
        title: `Live Warning !`,
        body: `Cooler Unit: Battey < 20%!\nModel:${currentCooler.coolerModel}\nVendor:${currentCooler.vendor}\nAddress:${currentCooler.address}`
      }
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });
      console.log(`Battery Warning notification response: ${receivedID}\n ${response}`); 
    }

  
    if (currentCooler) {
      // Get all drugs for this cooler
      const drugs = await db
        .collection("drugs")
        .find({ coolingUnitId: new ObjectId(receivedID) })
        .toArray()
      if (data.currentTemperature !== undefined) {

        // Check each drug to see if we need to update temperatureExceededSince and temperatureWarning
        for (const drug of drugs) {
          const updates: any = {}

          // Set temperature warning flag
          updates.temperatureWarning = data.currentTemperature > drug.maxTemperature

          if (data.currentTemperature > drug.maxTemperature) {
            // If temperature is above max and we don't have a timestamp yet, set it
            if (!drug.temperatureExceededSince) {
              updates.temperatureExceededSince = new Date()
            }
          } else {
            // If temperature is now below max, reset the timestamp
            // But only if the drug is not already unusable
            if (drug.temperatureExceededSince && !drug.unusable) {
              updates.temperatureExceededSince = null
            }
          }

          // Check if the drug should be marked as unusable
          if (drug.temperatureExceededSince && !drug.unusable) {
            const exceededSince = new Date(drug.temperatureExceededSince)
            const hoursExceeded = (new Date().getTime() - exceededSince.getTime()) / (1000 * 60 * 60)

            if (hoursExceeded > drug.unsuitableTimeThreshold) {
              updates.unusable = true
              if (updates.unusable) {
                console.log(`Live Unusable Alert: ${receivedID}`);
                payload = {
                  title: `Live Alert!`,
                  body: `A New Unusable Drug: ${drug.name}.\nCooler Unit: Exceeds Temperature limits (${drug.unsuitableTimeThreshold} hours) for ${hoursExceeded} hours!\nModel:${currentCooler.coolerModel}\nVendor:${currentCooler.vendor}\nAddress:${currentCooler.address}`
                }
                const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Cookie': "auth-role=user"
                  },
                  body: JSON.stringify(payload),
                });
                console.log(`Unusable Alert notification response: ${receivedID}\n ${response}`);
              }
            }
          }

          // Update the drug if we have changes
          if (Object.keys(updates).length > 0) {
            await db.collection("drugs").updateOne({ _id: drug._id }, { $set: updates })
          }
        }

        // Set temperatureWarning flag on the cooler if any drug has a warning
        const anyDrugWithWarning = drugs.some((drug) => data.currentTemperature > drug.maxTemperature)

        data.temperatureWarning = anyDrugWithWarning
        console.log(`Live Temperature Warning: ${receivedID}`);
        payload = {
          title: `Live Warning!`,
          body: `Cooler Unit: Exceeds Temperature limits ${data.currentTemperature}!\nModel:${currentCooler.coolerModel}\nVendor:${currentCooler.vendor}\nAddress:${currentCooler.address}`
        }
        const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': "auth-role=user"
          },
          body: JSON.stringify(payload),
        });
        console.log(`Temperature Warning notification response: ${receivedID}\n ${response}`); 
      }

      if (isAdmin(request)) {

        const result = await db
          .collection("coolingUnits")
          .findOneAndUpdate({ _id: new ObjectId(receivedID) }, { $set: data }, { returnDocument: "after" })
        if (!result) {
          return NextResponse.json({ error: "Cooling unit not found" }, { status: 404 })
        }
        const notedResult = {
          ...result,
          note: "Authorized Changes"
        };
        return NextResponse.json(notedResult)
      }

      else {
        let notes = "Authorized Changes";
        if (data.disabled !== undefined && data.disabled !== currentCooler.disabled) {
          notes = "Unauthorized Change detected, But updated any other field";
        }
        const { disabled, ...dataToSave } = data;
        const result = await db
          .collection("coolingUnits")
          .findOneAndUpdate({ _id: new ObjectId(receivedID) }, { $set: dataToSave }, { returnDocument: "after" })
        if (!result) {
          return NextResponse.json({ error: "Cooling unit not found" }, { status: 404 })
        }
        const notedResult = {
          ...result,
          note: notes
        };
        return NextResponse.json(notedResult)
      }
    }

  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to update cooling unit" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  // Check if user is admin
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const { db } = await connectToDatabase()

    // Delete the cooling unit
    const result = await db.collection("coolingUnits").deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Cooling unit not found" }, { status: 404 })
    }

    // Delete all drugs associated with this cooling unit
    await db.collection("drugs").deleteMany({ coolingUnitId: new ObjectId(params.id) })

    // Delete temperature history for this cooler
    await db.collection("temperatureHistory").deleteMany({ coolingUnitId: new ObjectId(params.id) })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to delete cooling unit" }, { status: 500 })
  }
}

