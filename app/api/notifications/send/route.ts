import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import admin from "firebase-admin"

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Firebase admin initialization error:", error)
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const authRole = cookieStore.get("auth-role")?.value

    // Only admins can send notifications
    if (authRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { tokens, notification, data } = await request.json()

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ error: "Tokens are required" }, { status: 400 })
    }

    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json({ error: "Notification title and body are required" }, { status: 400 })
    }

    // Send the notification using Firebase Admin SDK
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data || {},
      tokens,
    }

    const response = await admin.messaging().sendMulticast(message)

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    })
  } catch (error) {
    console.error("Error in send notification API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}