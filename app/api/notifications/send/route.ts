// app/api/send-notification/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { messaging } from '@/lib/firebase-admin';
import { cookies } from "next/headers"
import { ObjectId } from 'mongodb';

function isAdmin(request: Request) {
  const cookieStore = cookies()
  const authRole = cookieStore.get("auth-role")?.value
  return authRole === "admin"
}

export async function POST(req: Request) {
  try {
    const { title:titleReq, body:bodyreq } = await req.json();
    const { db } = await connectToDatabase();
    const tokensCollection = db.collection('deviceTokens');
    const devices = await tokensCollection.find({}).toArray();
    const deviceTokens = devices.map((d: any) => d.token);
    console.log(deviceTokens);
    console.log(`Message to send:\n${titleReq}\n${bodyreq}`);

    if (deviceTokens.length === 0) {
      return NextResponse.json({ error: 'No device tokens registered' }, { status: 400 });
    }

    // Make sure each token is correctly mapped into the right structure
    const messagePromises = deviceTokens.map((tokendb) =>
      messaging.send({
        token:tokendb,
        notification: {
          title:titleReq,
          body:bodyreq,
        },
      })
    );
    // Wait for all the messages to be sent
    const response = await Promise.all(messagePromises);

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
}
