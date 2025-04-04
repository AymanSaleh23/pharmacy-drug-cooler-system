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

    const drug = await db.collection("drugs").findOne({ _id: new ObjectId(params.id) })

    if (!drug) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 })
    }

    return NextResponse.json(drug)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to fetch drug" }, { status: 500 })
  }
}

// The PATCH and DELETE methods remain the same with admin checks

