import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { getObjectBytes, putObjectBytes } from "@/lib/r2";

// Step 2 of upload: the original is in storage. Read its size and make a thumbnail.
// Watermarked client previews are a later step; thumbnails here are for the photographer's grid.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const { id, photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: photo } = await supabase
    .from("photos").select("id, original_key").eq("id", photoId).eq("gallery_id", id).maybeSingle();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const original = await getObjectBytes(photo.original_key);
    const img = sharp(original).rotate();
    const { width, height } = await img.metadata();
    const thumb = await img.resize({ width: 480, height: 480, fit: "inside" }).jpeg({ quality: 78 }).toBuffer();
    const thumbKey = photo.original_key.replace("/originals/", "/thumbs/").replace(/\.[a-z0-9]+$/, ".jpg");
    await putObjectBytes(thumbKey, thumb, "image/jpeg");
    await supabase.from("photos").update({ thumb_key: thumbKey, width, height }).eq("id", photoId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Processing failed" }, { status: 500 });
  }
}
