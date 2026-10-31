import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { thumbKeyFor } from "@/lib/r2";

// Step 2 of upload: the browser has put the original and its thumbnail in storage; record them.
// Thumbnails are made in the browser because the Cloudflare Workers runtime has no native image library.
export async function POST(request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const { id, photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: photo } = await supabase
    .from("photos").select("id, original_key").eq("id", photoId).eq("gallery_id", id).maybeSingle();
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { width, height } = await request.json();
  const { error } = await supabase
    .from("photos")
    .update({ thumb_key: thumbKeyFor(photo.original_key), width: Number(width) || null, height: Number(height) || null })
    .eq("id", photoId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
