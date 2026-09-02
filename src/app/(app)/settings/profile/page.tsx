import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="font-display text-3xl text-ink">Perfil</h1>
      <p className="mt-1 text-sm text-ink-muted">Tu identidad dentro de Coffee Journal.</p>

      <div className="mt-8 rounded-card border border-border bg-surface p-5">
        <ProfileForm
          initialDisplayName={profile?.display_name ?? ""}
          role={profile?.role ?? "admin"}
        />
      </div>
    </div>
  );
}
