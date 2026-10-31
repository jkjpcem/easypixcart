import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { signedDownloadUrl } from "@/lib/r2";
import { parseRoster } from "@/lib/roster";
import PhotoUploader from "@/components/PhotoUploader";

async function importRoster(formData: FormData) {
  "use server";
  const galleryId = String(formData.get("gallery_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("file");
  const text = file instanceof File && file.size > 0 ? await file.text() : String(formData.get("csv") ?? "");
  const rows = parseRoster(text);
  if (!rows.length) return;

  const { error } = await supabase.from("subjects").insert(rows.map((r) => ({ ...r, gallery_id: galleryId })));
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/galleries/${galleryId}`);
}

export default async function GalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gallery } = await supabase.from("galleries").select("id, title, access_code, status").eq("id", id).maybeSingle();
  if (!gallery) notFound();

  const [{ data: subjects }, { data: photos }] = await Promise.all([
    supabase.from("subjects").select("id, name, group_label, email").eq("gallery_id", id).order("group_label").order("name"),
    supabase.from("photos").select("id, thumb_key").eq("gallery_id", id).order("created_at"),
  ]);

  const thumbs = await Promise.all(
    (photos ?? []).map(async (p) => ({ id: p.id, url: p.thumb_key ? await signedDownloadUrl(p.thumb_key) : null })),
  );

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/dashboard" className="text-sm text-gray-500 underline">← Galleries</Link>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">{gallery.title}</h1>
      <p className="mb-8 text-sm text-gray-500">
        {gallery.status}{gallery.access_code ? ` · access code ${gallery.access_code}` : " · no access code"}
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Photos ({thumbs.length})</h2>
        <PhotoUploader galleryId={id} />
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {thumbs.map((t) =>
            t.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={t.id} src={t.url} alt="" className="aspect-square w-full rounded object-cover" />
            ) : (
              <div key={t.id} className="aspect-square rounded bg-gray-200" />
            ),
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Roster ({subjects?.length ?? 0})</h2>
        <form action={importRoster} className="mb-4 flex flex-col gap-2">
          <input type="hidden" name="gallery_id" value={id} />
          <textarea name="csv" rows={4} placeholder={"name, class or team, parent email\nAva Kim, Period 3, ava@example.com"} className="rounded border p-2 font-mono text-sm" />
          <div className="flex items-center gap-3">
            <input type="file" name="file" accept=".csv,text/csv" className="text-sm" />
            <button className="rounded bg-black px-4 py-2 text-white">Import</button>
          </div>
        </form>
        <table className="w-full text-sm">
          <tbody className="divide-y">
            {subjects?.map((s) => (
              <tr key={s.id}>
                <td className="py-2">{s.name}</td>
                <td className="text-gray-500">{s.group_label}</td>
                <td className="text-gray-500">{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
