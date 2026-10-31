import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gallery";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createStudio(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("photographers").insert({ id: user.id, studio_name: String(formData.get("studio_name")) });
  revalidatePath("/dashboard");
}

async function createGallery(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const title = String(formData.get("title"));
  const code = String(formData.get("access_code") || "") || null;
  await supabase.from("galleries").insert({ photographer_id: user.id, title, slug: slugify(title), access_code: code });
  revalidatePath("/dashboard");
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: studio } = await supabase.from("photographers").select("studio_name").eq("id", user.id).maybeSingle();
  if (!studio) {
    return (
      <main className="mx-auto max-w-sm p-8">
        <h1 className="mb-4 text-xl font-semibold">Name your studio</h1>
        <form action={createStudio} className="flex flex-col gap-3">
          <input name="studio_name" required placeholder="Studio name" className="rounded border p-2" />
          <button className="rounded bg-black p-2 text-white">Continue</button>
        </form>
      </main>
    );
  }

  const { data: galleries } = await supabase
    .from("galleries").select("id, title, slug, status, created_at").order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">{studio.studio_name}</h1>
      <form action={createGallery} className="mb-8 flex gap-2">
        <input name="title" required placeholder="New gallery title" className="flex-1 rounded border p-2" />
        <input name="access_code" placeholder="Access code (optional)" className="w-48 rounded border p-2" />
        <button className="rounded bg-black px-4 text-white">Create</button>
      </form>
      <ul className="divide-y">
        {galleries?.map((g) => (
          <li key={g.id} className="flex justify-between py-3">
            <span>{g.title}</span>
            <span className="text-sm text-gray-500">{g.status}</span>
          </li>
        ))}
        {!galleries?.length && <li className="py-3 text-gray-500">No galleries yet.</li>}
      </ul>
    </main>
  );
}
