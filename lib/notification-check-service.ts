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
    const { db } = await connectToDatabase();
    const now = new Date();
    console.log(`Now ${now}`)
    // Reference dates
    const threeMonthsFromNow = new Date(now);
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    console.log(`3M  ${new Date(threeMonthsFromNow)}`)

    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(now.getMonth() + 1);
    console.log(`1M  ${new Date(oneMonthFromNow)}`)

    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(now.getDate() + 7);
    console.log(`1W  ${new Date(oneWeekFromNow)}`)

    // Get all drugs expiring from today back to the future (including expired)
    const expiringDrugs = await db.collection("drugs").aggregate([
      {
        $lookup: {
          from: "coolingUnits",
          localField: "coolingUnitId",
          foreignField: "_id",
          as: "cooler",
        },
      },
      { $unwind: "$cooler" },
      {
        $match: {
          expirationDate: { $lte: threeMonthsFromNow } // include expired drugs
        },
      },
      {
        $project: {
          name: 1,
          vendor: 1,
          expirationDate: 1,
          maxTemperature: 1,
          unsuitableTimeThreshold: 1,
          numberOfPackages: 1,
          specifications: 1,
          unusable: 1,
          temperatureWarning: 1,
          temperatureExceededSince: 1,
          notificationThreeMExp: 1,
          notificationOneMExp: 1,
          notificationOneWeekExp: 1,
          notificationSentForExpired: 1,
          // Include cooler name and address as top-level fields
          coolingUnitName: "$cooler.coolerModel",
          coolingUnitAddress: "$cooler.address"
        },
      },
    ]).toArray();
    console.log("Total drugs matched for check: ", expiringDrugs.length);

    const threeMonthsDrugs = expiringDrugs.filter(drug => {
      const exp = new Date(drug.expirationDate);
      console.log(`drug.expirationDate ${exp} , start ${threeMonthsFromNow}`);
      return  (exp <= threeMonthsFromNow && exp > oneMonthFromNow && !drug.notificationThreeMExp);
    });

    const oneMonthDrugs = expiringDrugs.filter(drug => {
      const exp = new Date(drug.expirationDate);
      console.log(`drug.expirationDate ${exp} , start ${oneMonthFromNow}`);
      return  (exp <= oneMonthFromNow && exp > oneWeekFromNow && !drug.notificationOneMExp);
    });

    const oneWeekDrugs = expiringDrugs.filter(drug => {
      const exp = new Date(drug.expirationDate);
      console.log(`drug.expirationDate ${exp} , start ${oneWeekFromNow}`);
      return  (exp <= oneWeekFromNow && exp > now && !drug.notificationOneWeekExp);
    });

    const expiredDrugs = expiringDrugs.filter(drug => {
      const exp = new Date(Date.parse(drug.expirationDate));
      console.log(`drug.expirationDate ${exp} , condition ${exp < now}`);
      return  (exp < now && !drug.notificationSentForExpired);
    });

    console.log("3 months drugs: ", threeMonthsDrugs.length + ` ${threeMonthsDrugs}`);
    console.log("1 month drugs: ", oneMonthDrugs.length + ` ${oneMonthDrugs}`);
    console.log("1 week drugs: ", oneWeekDrugs.length + ` ${oneWeekDrugs}`);
    console.log("Expired drugs: ", expiredDrugs.length + ` ${expiredDrugs}`);

    // Generic notification sender
    const sendNotification = async (drugs, title, body, flag) => {
      if (drugs.length === 0) return;

      const payload = { title, body };

      await fetch(`${process.env.NEXT_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'auth-role=user',
        },
        body: JSON.stringify(payload),
      });

      if (!debug) {
        const drugIds = drugs.map(drug => drug._id);
        await db.collection("drugs").updateMany(
          { _id: { $in: drugIds } },
          { $set: { [flag]: true } }
        );
      }
    };

    await sendNotification(
      threeMonthsDrugs,
      "3 Months Drug Expiration",
      `${threeMonthsDrugs.length} drug(s) will expire in 3 months.\n\n` +
      threeMonthsDrugs.map(drug =>
        `Drug:${drug.name}\nCooling Unit: ${drug.coolingUnitName}\nAddress: ${drug.coolingUnitAddress}\nExpire: ${drug.expirationDate}`
      ).join("\n\n"),
      "notificationThreeMExp"
    );
    await sendNotification(
      oneMonthDrugs,
      "1 Months Drug Expiration",
      `${oneMonthDrugs.length} drug(s) will expire in 1 month.\n\n` +
      oneMonthDrugs.map(drug =>
        `Drug:${drug.name}\nCooling Unit: ${drug.coolingUnitName}\nAddress: ${drug.coolingUnitAddress}\nExpire: ${drug.expirationDate}`
      ).join("\n\n"),
      "notificationOneMExp"
    );

    await sendNotification(
      oneWeekDrugs,
      "1 Week Drug Expiration",
      `${oneWeekDrugs.length} drug(s) will expire in 1 week.\n\n` +
      oneWeekDrugs.map(drug =>
        `Drug:${drug.name}\nCooling Unit: ${drug.coolingUnitName}\nAddress: ${drug.coolingUnitAddress}\nExpire: ${drug.expirationDate}`
      ).join("\n\n"),
      "notificationOneWeekExp"
    );

    await sendNotification(
      expiredDrugs,
      "Drugs Already Expired",
      `${expiredDrugs.length} drug(s) have already expired.\n\n` +
      expiredDrugs.map(drug =>
        `Drug:${drug.name}\nCooling Unit: ${drug.coolingUnitName}\nAddress: ${drug.coolingUnitAddress}\nExpire: ${drug.expirationDate}`
      ).join("\n\n"),
      "notificationSentForExpired"
    );

  } catch (error) {
    console.error("Error checking expiration warnings:", error);
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
