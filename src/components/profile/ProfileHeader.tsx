import { IconPerfil } from "@/components/icons/pencil-icons";
import type { PublicProfile } from "@/features/profile/publicQueries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function ProfileHeader({ profile }: { profile: PublicProfile; dict: Dictionary }) {
  return (
    <header className="flex items-start gap-4">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-canvas text-ink-muted">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar_url has no upload UI yet, so its shape (own storage vs. external) isn't settled
          <img src={profile.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          <IconPerfil aria-hidden className="size-7" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-xl text-ink">
          {profile.display_name || `@${profile.username}`}
        </p>
        <p className="text-sm text-ink-muted">@{profile.username}</p>
        {profile.bio && <p className="mt-2 text-sm text-ink">{profile.bio}</p>}
        {/* Contadores de seguidores/seguidos — Fase 10 */}
      </div>
    </header>
  );
}
