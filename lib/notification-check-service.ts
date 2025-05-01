import { connectToDatabase } from "@/lib/mongodb"

// Check for temperature warnings
export async function checkTemperatureWarnings(debug): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    // Find all coolers with drugs that have temperature warnings
    const coolers = await db
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
          $match: {
            drugs: { $ne: [] },
          },
        },
        {
          $addFields: {
            hasTemperatureWarning: {
              $anyElementTrue: {
                $map: {
                  input: "$drugs",
                  as: "drug",
                  in: { $gt: ["$currentTemperature", "$$drug.maxTemperature"] },
                },
              },
            },
          },
        },
        {
          $match: {
            hasTemperatureWarning: true,
          },
        },
      ])
      .toArray()

    // Send notifications for each cooler with temperature warnings
    for (const cooler of coolers) {
      // Get the affected drugs
      const affectedDrugs = cooler.drugs.filter((drug: any) => cooler.currentTemperature > drug.maxTemperature)

      if (affectedDrugs.length === 0) continue

      // Create notification message
      const title = `Temperature Warning: ${cooler.coolerModel}`
      const body = `Temperature (${cooler.currentTemperature}°C) exceeds safe levels for ${affectedDrugs.length} drug(s).`
      const payload = {
        title: title,
        body: body
      }
      // Send to admins
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });
    }
  } catch (error) {
    console.error("Error checking temperature warnings:", error)
  }
}
export async function checkTemperatureBatteryWarning(debug): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    // Find all coolers with drugs that have temperature warnings
    const coolers = await db
      .collection("coolingUnits")
      .find({
        batteryWarning: true,
        ...(debug ? {} : { notificationSentForBatteryWarning: { $ne: true } }),
      })
      .toArray()


    // Send notifications for each cooler with temperature warnings
    for (const cooler of coolers) {
      // Create notification message
      const title = `Battery Warning: ${cooler.coolerModel}`
      const body = `Battery Below Average (${cooler.batteryLevel} %) replace battery unit ASAP for stability connection.`
      const payload = {
        title: title,
        body: body
      }
      // Send to admins
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });
    }
  } catch (error) {
    console.error("Error checking temperature warnings:", error)
  }
}

// Check for expiration warnings
export async function checkExpirationWarnings(debug): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    const now = new Date()

    // Calculate dates for 3 months, 1 month, and 1 week from now
    const threeMonthsFromNow = new Date(now)
    threeMonthsFromNow.setMonth(now.getMonth() + 3)

    const oneMonthFromNow = new Date(now)
    oneMonthFromNow.setMonth(now.getMonth() + 1)

    const oneWeekFromNow = new Date(now)
    oneWeekFromNow.setDate(now.getDate() + 7)

    // Find drugs that are about to expire
    const expiringDrugs = await db
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
        {
          $match: {
            $or: [
              // 3 months warning (only if the day matches to avoid daily notifications)
              {
                expirationDate: {
                  $gte: new Date(threeMonthsFromNow.setHours(0, 0, 0, 0)),
                  $lt: new Date(threeMonthsFromNow.setHours(23, 59, 59, 999)),
                },
              },
              // 1 month warning (only if the day matches)
              {
                expirationDate: {
                  $gte: new Date(oneMonthFromNow.setHours(0, 0, 0, 0)),
                  $lt: new Date(oneMonthFromNow.setHours(23, 59, 59, 999)),
                },
              },
              // 1 week warning (only if the day matches)
              {
                expirationDate: {
                  $gte: new Date(oneWeekFromNow.setHours(0, 0, 0, 0)),
                  $lt: new Date(oneWeekFromNow.setHours(23, 59, 59, 999)),
                },
              },
            ],
          },
        },
      ])
      .toArray()

    // Group drugs by expiration timeframe
    const threeMonthsDrugs = debug
      ? expiringDrugs
      : expiringDrugs.filter(
        (drug) =>
          drug.expirationDate >= threeMonthsFromNow.setHours(0, 0, 0, 0) &&
          drug.expirationDate < threeMonthsFromNow.setHours(23, 59, 59, 999)
      )

    const oneMonthDrugs = debug
      ? expiringDrugs
      : expiringDrugs.filter(
        (drug) =>
          drug.expirationDate >= oneMonthFromNow.setHours(0, 0, 0, 0) &&
          drug.expirationDate < oneMonthFromNow.setHours(23, 59, 59, 999)
      )

    const oneWeekDrugs = debug
      ? expiringDrugs
      : expiringDrugs.filter(
        (drug) =>
          drug.expirationDate >= oneWeekFromNow.setHours(0, 0, 0, 0) &&
          drug.expirationDate < oneWeekFromNow.setHours(23, 59, 59, 999)
      )


    // Send notifications for each timeframe
    if (threeMonthsDrugs.length > 0) {
      const title = `Drugs Expiring in 3 Months`
      const body = `${threeMonthsDrugs.length} drug(s) will expire in 3 months.`

      const payload = {
        title: title,
        body: body
      }
      // Send to admins
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });
    }

    if (oneMonthDrugs.length > 0) {
      const title = `Drugs Expiring in 1 Month`
      const body = `${oneMonthDrugs.length} drug(s) will expire in 1 month.`

      const payload = {
        title: title,
        body: body
      }
      // Send to admins
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });
    }

    if (oneWeekDrugs.length > 0) {
      const title = `Drugs Expiring in 1 Week`
      const body = `${oneWeekDrugs.length} drug(s) will expire in 1 week.`

      const payload = {
        title: title,
        body: body
      }
      // Send to admins
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });
    }
  } catch (error) {
    console.error("Error checking expiration warnings:", error)
  }
}

// Check for unusable drugs
export async function checkUnusableDrugs(debug): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    // Find drugs that have just become unusable
    // We'll use a flag in the database to track which drugs we've already sent notifications for
    const matchStage: any = {
      unusable: true,
    }

    if (debug !== true) {
      matchStage.notificationSentForUnusable = { $ne: true }
    }
    const newlyUnusableDrugs = await db
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
        {
          $match: matchStage,
        },
      ])
      .toArray()

    if (newlyUnusableDrugs.length === 0) return

    // Group drugs by cooler
    const drugsByCooler = newlyUnusableDrugs.reduce((acc, drug) => {
      const coolerId = drug.cooler._id.toString()
      if (!acc[coolerId]) {
        acc[coolerId] = {
          cooler: drug.cooler,
          drugs: [],
        }
      }
      acc[coolerId].drugs.push(drug)
      return acc
    }, {})

    // Send notifications for each cooler
    for (const [coolerId, data] of Object.entries(drugsByCooler)) {
      const { cooler, drugs } = data

      const title = `Unusable Drugs in ${cooler.coolerModel}`
      const body = `${drugs.length} drug(s) have become unusable.`

      const payload = {
        title: title,
        body: body
      }
      // Send to admins
      const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': "auth-role=user"
        },
        body: JSON.stringify(payload),
      });

      // Update drugs to mark notifications as sent
      const drugIds = drugs.map((drug) => drug._id)
      await db
        .collection("drugs")
        .updateMany({ _id: { $in: drugIds } }, { $set: { notificationSentForUnusable: true } })
    }
  } catch (error) {
    console.error("Error checking unusable drugs:", error)
  }
}

// Check for unavailable coolers
export async function checkUnavailableCoolers(debug): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    // Find coolers that have just become unavailable or unreachable
    const now = new Date()
    const thirtySecondsAgo = new Date(now.getTime() - 30000)

    const matchStageAvailable: any = {
      availability: false,
    }

    if (debug !== true) {
      matchStageAvailable.notificationSentForUnavailable = { $ne: true }
    }
    const matchStageUnreach: any = {
      lastUpdatedTemperature: { $lt: thirtySecondsAgo }
    }

    if (debug !== true) {
      matchStageAvailable.notificationSentForUnreachable = { $ne: true }
    }

    const unavailableCoolers = await db
      .collection("coolingUnits")
      .find({
        $or: [
          matchStageAvailable,
          matchStageUnreach
        ],
      })
      .toArray()

    for (const cooler of unavailableCoolers) {
      const isUnreachable = cooler.lastUpdatedTemperature < thirtySecondsAgo
      const isUnavailable = !cooler.availability

      if (isUnreachable && (debug || !cooler.notificationSentForUnreachable)) {
        const title = `Cooler Unreachable: ${cooler.coolerModel}`
        const body = `The cooler has not reported temperature for over 30 seconds.`

        const payload = {
          title: title,
          body: body
        }
        // Send to admins
        const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': "auth-role=user"
          },
          body: JSON.stringify(payload),
        });

        // Mark notification as sent
        await db
          .collection("coolingUnits")
          .updateOne({ _id: cooler._id }, { $set: { notificationSentForUnreachable: true } })
      }

      if (isUnavailable && (debug || !cooler.notificationSentForUnavailable)) {
        const title = `Cooler Unavailable: ${cooler.coolerModel}`
        const body = `The cooler has been marked as unavailable.`

        const payload = {
          title: title,
          body: body
        }
        // Send to admins
        const response = await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': "auth-role=user"
          },
          body: JSON.stringify(payload),
        });
        // Mark notification as sent
        await db
          .collection("coolingUnits")
          .updateOne({ _id: cooler._id }, { $set: { notificationSentForUnavailable: true } })
      }
    }
  } catch (error) {
    console.error("Error checking unavailable coolers:", error)
  }
}

// Reset notification flags when coolers become available again
export async function resetNotificationFlags(): Promise<void> {
  try {
    const { db } = await connectToDatabase()

    const now = new Date()
    const thirtySecondsAgo = new Date(now.getTime() - 30000)

    // Reset flags for coolers that are now available and reachable
    await db.collection("coolingUnits").updateMany(
      {
        availability: true,
        lastUpdatedTemperature: { $gte: thirtySecondsAgo },
        $or: [{ notificationSentForUnavailable: true }, { notificationSentForUnreachable: true }],
      },
      {
        $set: {
          notificationSentForUnavailable: false,
          notificationSentForUnreachable: false,
        },
      },
    )
    // Reset flags for coolers that are now > 25 % battery charge
    await db.collection("coolingUnits").updateMany(
      {
        batteryWarning: false,
        batteryLevel: { $gte: 25 },
        notificationSentForBatteryWarning: true,
      },
      {
        $set: {
          notificationSentForBatteryWarning: false,
        },
      },
    )

    // Reset flags for drugs that are no longer unusable
    // Note: In your system, drugs can't become "un-unusable", but we'll include this for completeness
    await db
      .collection("drugs")
      .updateMany(
        { unusable: false, notificationSentForUnusable: true },
        { $set: { notificationSentForUnusable: false } },
      )
  } catch (error) {
    console.error("Error resetting notification flags:", error)
  }
}
