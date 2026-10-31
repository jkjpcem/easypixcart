import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { signedUploadUrl, thumbKeyFor } from "@/lib/r2";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

// Step 1 of upload: register the photo and hand back a short-lived signed PUT URL.
// The browser uploads the original and a thumbnail straight to R2, so large files never pass through our server.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename, contentType } = await request.json();
  if (!ALLOWED.has(contentType)) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  // RLS limits this select to the caller's own galleries.
  const { data: gallery } = await supabase.from("galleries").select("id").eq("id", id).maybeSingle();
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = String(filename).split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `galleries/${id}/originals/${randomUUID()}.${ext}`;
  const { data: photo, error } = await supabase
    .from("photos").insert({ gallery_id: id, original_key: key }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [uploadUrl, thumbUploadUrl] = await Promise.all([
    signedUploadUrl(key, contentType),
    signedUploadUrl(thumbKeyFor(key), "image/jpeg"),
  ]);
  return NextResponse.json({ photoId: photo.id, uploadUrl, thumbUploadUrl });
}
