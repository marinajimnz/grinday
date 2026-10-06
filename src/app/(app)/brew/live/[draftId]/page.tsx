import { BrewLiveScreen } from "@/components/brew/BrewLiveScreen";
import { titleFrom } from "@/lib/i18n/metadata";

export const generateMetadata = titleFrom((d) => d.brew.title);

export default async function BrewLivePage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <BrewLiveScreen draftId={draftId} />
    </div>
  );
}
