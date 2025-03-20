import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"

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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()
    const data = await request.json()

    // Get the current drug to check if unusable is already true
    const currentDrug = await db.collection("drugs").findOne({ _id: new ObjectId(params.id) })

    if (!currentDrug) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 })
    }

    // If unusable is already true, we don't allow changing it back to false
    if (currentDrug.unusable === true && data.unusable === false) {
      data.unusable = true // Keep it true
    }

    const result = await db
      .collection("drugs")
      .findOneAndUpdate({ _id: new ObjectId(params.id) }, { $set: data }, { returnDocument: "after" })

    if (!result) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to update drug" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db } = await connectToDatabase()

    const result = await db.collection("drugs").deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Database error:", error)
    return NextResponse.json({ error: "Failed to delete drug" }, { status: 500 })
  }
}

