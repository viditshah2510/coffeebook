import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estates } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await db.insert(estates).values({
      id,
      name,
      location: body.location?.trim() || null,
      country: body.country?.trim() || null,
      masl: body.masl ? parseInt(body.masl) : null,
    });

    return NextResponse.json({ id, name });
  } catch (err) {
    console.error("Create estate failed:", err);
    return NextResponse.json({ error: "Failed to create estate" }, { status: 500 });
  }
}
