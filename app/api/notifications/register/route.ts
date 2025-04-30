// app/api/register-device/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb'; // Assuming you have this
import { cookies } from "next/headers"
import { ObjectId } from 'mongodb';

function isAdmin(request: Request) {
  const cookieStore = cookies()
  const authRole = cookieStore.get("auth-role")?.value
  return authRole === "admin"
}

export async function POST(request: Request) {
  try {
    if (isAdmin(request) === true || isAdmin(request) === false) {


      const { token: deviceToken } = await request.json();

      if (!deviceToken) {
        return NextResponse.json({ error: 'Missing device token' }, { status: 400 });
      }

      const { db } = await connectToDatabase();
      const tokensCollection = db.collection('deviceTokens');

      // Insert if not already exists
      await tokensCollection.updateOne(
        { token:deviceToken },
        { $setOnInsert: { deviceToken, createdAt: new Date() } },
        { upsert: true }
      );

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
