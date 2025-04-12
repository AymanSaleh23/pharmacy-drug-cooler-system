import { onTokenRefresh } from "firebase/messaging";
import { initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging
let messaging: any

// We need to check if we're in the browser environment before initializing messaging
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app)
  } catch (error) {
    console.error("Firebase messaging initialization error:", error)
  }
}

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("Notification permission denied")
      return null
    }

    // Get FCM token
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })

    if (currentToken) {
      console.log("FCM token:", currentToken)
      return currentToken
    } else {
      console.log("No registration token available")
      return null
    }
  } catch (error) {
    console.error("An error occurred while retrieving token:", error)
    return null
  }
}

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}

export const setupTokenRefresh = () => {
  if (!messaging) return;
  
  onTokenRefresh(async () => {
    try {
      const refreshedToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      
      // Register the new token with your backend
      await fetch("/api/notifications/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: refreshedToken }),
      });
      
      console.log("Token refreshed");
    } catch (error) {
      console.error("Unable to retrieve refreshed token", error);
    }
  });
};
export { messaging }

