import type { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"

// Interface for device tokens
export interface DeviceToken {
  _id?: string | ObjectId
  userId: string
  token: string
  createdAt: Date
  updatedAt: Date
}

// Interface for notification preferences
export interface NotificationPreferences {
  _id?: string | ObjectId
  userId: string
  temperatureWarnings: boolean
  expirationReminders: boolean
  unusableAlerts: boolean
  unavailableAlerts: boolean
  createdAt: Date
  updatedAt: Date
}

// Register a device token for a user
export async function registerDeviceToken(userId: string, token: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()

    // Check if token already exists
    const existingToken = await db.collection("deviceTokens").findOne({ token })

    if (existingToken) {
      // Update the existing token with the new userId
      await db.collection("deviceTokens").updateOne(
        { token },
        {
          $set: {
            userId,
            updatedAt: new Date(),
          },
        },
      )
    } else {
      // Insert new token
      await db.collection("deviceTokens").insertOne({
        userId,
        token,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create default notification preferences if they don't exist
    const existingPrefs = await db.collection("notificationPreferences").findOne({ userId })

    if (!existingPrefs) {
      await db.collection("notificationPreferences").insertOne({
        userId,
        temperatureWarnings: true,
        expirationReminders: true,
        unusableAlerts: true,
        unavailableAlerts: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    return true
  } catch (error) {
    console.error("Error registering device token:", error)
    return false
  }
}

// Get user's notification preferences
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  try {
    const { db } = await connectToDatabase()

    const preferences = await db.collection("notificationPreferences").findOne({ userId })

    return preferences as NotificationPreferences
  } catch (error) {
    console.error("Error getting notification preferences:", error)
    return null
  }
}

// Update user's notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()

    await db.collection("notificationPreferences").updateOne(
      { userId },
      {
        $set: {
          ...preferences,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    )

    return true
  } catch (error) {
    console.error("Error updating notification preferences:", error)
    return false
  }
}

// Send a notification to a specific user
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()

    // Get user's device tokens
    const deviceTokens = await db.collection("deviceTokens").find({ userId }).toArray()

    if (deviceTokens.length === 0) {
      console.log(`No device tokens found for user ${userId}`)
      return false
    }

    // Get user's notification preferences
    const preferences = await getNotificationPreferences(userId)

    if (!preferences) {
      console.log(`No notification preferences found for user ${userId}`)
      return false
    }

    // Check if the notification type is enabled based on data.type
    if (
      (data.type === "temperature_warning" && !preferences.temperatureWarnings) ||
      (data.type === "expiration_reminder" && !preferences.expirationReminders) ||
      (data.type === "unusable_alert" && !preferences.unusableAlerts) ||
      (data.type === "unavailable_alert" && !preferences.unavailableAlerts)
    ) {
      console.log(`Notification type ${data.type} is disabled for user ${userId}`)
      return false
    }

    // Send notification to each device token
    const tokens = deviceTokens.map((dt) => dt.token)

    // Call Firebase Admin SDK to send the notification
    // This will be implemented in the API route
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tokens,
        notification: {
          title,
          body,
        },
        data,
      }),
    })

    // Log the notification
    await db.collection("notificationLogs").insertOne({
      userId,
      title,
      body,
      data,
      sentAt: new Date(),
    })

    return true
  } catch (error) {
    console.error("Error sending notification:", error)
    return false
  }
}

// Send notifications to all admin users
export async function sendNotificationToAdmins(
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase()

    // In a real app, you would have a users collection with roles
    // For this example, we'll use a hardcoded admin user ID
    const adminUserId = "admin"

    return await sendNotificationToUser(adminUserId, title, body, data)
  } catch (error) {
    console.error("Error sending notification to admins:", error)
    return false
  }
}

