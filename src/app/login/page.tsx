import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signIn(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

async function signUp(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?error=Check%20your%20email%20to%20confirm%20your%20account");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-6 text-2xl font-semibold">EasyPixCart</h1>
      {error && <p className="mb-4 rounded bg-amber-100 p-3 text-sm text-amber-900">{error}</p>}
      <form className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Password" required minLength={8} className="rounded border p-2" />
        <button formAction={signIn} className="rounded bg-black p-2 text-white">Sign in</button>
        <button formAction={signUp} className="rounded border p-2">Create account</button>
      </form>
    </main>
  );
}
