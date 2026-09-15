import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrewPhotoStage } from "@/components/brew/BrewPhotoStage";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import type { BrewDraftPhoto } from "@/features/brew/draft";
import es from "@/lib/i18n/dictionaries/es";

const PHOTO: BrewDraftPhoto = { kind: "espresso", storagePath: "user-1/attempts/drafts/d1/1.jpg" };

const createSignedUrls = vi.fn(async (paths: string[]) => ({
  data: paths.map((path) => ({ path, signedUrl: `https://signed.test/${path}` })),
  error: null,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: { from: () => ({ createSignedUrls, upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) },
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  }),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

function Harness({ photos }: { photos: BrewDraftPhoto[] }) {
  return (
    <LocaleProvider locale="es" dict={es}>
      <BrewPhotoStage draftId="d1" photos={photos} onChange={vi.fn()} />
    </LocaleProvider>
  );
}

describe("BrewPhotoStage", () => {
  it("still shows the photo after a re-render lands mid-signing", async () => {
    // The parent rebuilds its `photos` array on every render, so this
    // component re-renders while the signed URL is still in flight. A
    // cleanup that cancelled that request would drop the URL for good —
    // the path is already marked as requested, so it'd never be asked for
    // again and the photo would sit blank. See BrewPhotoStage's effect.
    const { rerender } = render(<Harness photos={[PHOTO]} />);
    rerender(<Harness photos={[{ ...PHOTO }]} />);
    rerender(<Harness photos={[{ ...PHOTO }]} />);

    const img = await screen.findByRole("img", { name: es.enums.attemptMediaKind.espresso });
    expect(img).toBeInTheDocument();
    // Re-renders that changed no photo must not re-sign the same path.
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
  });
});
