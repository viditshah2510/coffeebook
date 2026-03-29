import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL" }, { status: 400 });
    }

    let base64: string;
    let mediaType = "image/webp";

    // Handle local uploads
    if (imageUrl.startsWith("/api/uploads/")) {
      const filename = path.basename(imageUrl);
      const filepath = path.join(process.cwd(), "data", "uploads", filename);
      const buffer = await readFile(filepath);
      base64 = buffer.toString("base64");
    } else {
      const imgResponse = await fetch(imageUrl);
      const arrayBuffer = await imgResponse.arrayBuffer();
      base64 = Buffer.from(arrayBuffer).toString("base64");
      mediaType = imgResponse.headers.get("content-type") || "image/jpeg";
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Extract coffee information from this coffee bag/label image. Return ONLY valid JSON with these fields:
{
  "coffee_name": "brand and product name",
  "origin": "country, region, or estate name if visible",
  "roast_level": "light" or "medium" or "medium-dark" or "dark" (infer from color descriptions or explicit mentions),
  "flavor_notes": "comma-separated flavor descriptors if listed",
  "coffee_weight": weight in grams as a number if visible, or null
}
Return null for any field you cannot determine from the image. Return ONLY the JSON, no other text.`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse OCR result" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      { error: "OCR processing failed" },
      { status: 500 }
    );
  }
}
