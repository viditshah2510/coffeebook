import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const client = new Anthropic();

async function loadImage(imageUrl: string): Promise<{ base64: string; mediaType: string }> {
  let base64: string;
  let mediaType = "image/webp";

  if (imageUrl.startsWith("/api/uploads/")) {
    const filename = path.basename(imageUrl);
    const filepath = path.join(process.cwd(), "data", "uploads", filename);
    const buffer = await readFile(filepath);
    base64 = buffer.toString("base64");

    if (buffer[0] === 0xFF && buffer[1] === 0xD8) mediaType = "image/jpeg";
    else if (buffer[0] === 0x89 && buffer[1] === 0x50) mediaType = "image/png";
    else if (buffer[0] === 0x47 && buffer[1] === 0x49) mediaType = "image/gif";
  } else {
    const imgResponse = await fetch(imageUrl);
    const arrayBuffer = await imgResponse.arrayBuffer();
    base64 = Buffer.from(arrayBuffer).toString("base64");
    mediaType = imgResponse.headers.get("content-type") || "image/jpeg";
  }

  return { base64, mediaType };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both single imageUrl and multiple imageUrls
    const imageUrls: string[] = body.imageUrls || (body.imageUrl ? [body.imageUrl] : []);

    if (imageUrls.length === 0) {
      return NextResponse.json({ error: "No image URL" }, { status: 400 });
    }

    // Load all images
    const images = await Promise.all(imageUrls.map(loadImage));

    const content: Anthropic.Messages.ContentBlockParam[] = [
      ...images.map((img) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: img.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: img.base64,
        },
      })),
      {
        type: "text" as const,
        text: `Extract coffee information from ${images.length > 1 ? "these coffee bag/label images (front, back, etc.)" : "this coffee bag/label image"}. Combine information from all images. Return ONLY valid JSON with these fields:
{
  "coffee_name": "brand and product name",
  "origin": "country, region, or estate name if visible",
  "roast_level": "light" or "medium" or "medium-dark" or "dark" (infer from color descriptions or explicit mentions),
  "flavor_notes": "comma-separated flavor descriptors if listed",
  "coffee_weight": weight in grams as a number if visible, or null,
  "process_method": "washed" or "natural" or "anaerobic" or "honey" or "permaculture" if mentioned, or null
}
Return null for any field you cannot determine from the image(s). Return ONLY the JSON, no other text.`,
      },
    ];

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content }],
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
