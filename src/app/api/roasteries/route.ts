import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roasteries } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.insert(roasteries).values({ id, name: name.trim() });

    return NextResponse.json({ id, name: name.trim() });
  } catch (err) {
    console.error("Create roastery failed:", err);
    return NextResponse.json({ error: "Failed to create roastery" }, { status: 500 });
  }
}
