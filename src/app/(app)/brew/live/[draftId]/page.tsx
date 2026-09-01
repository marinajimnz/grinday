import { BrewLiveScreen } from "@/components/brew/BrewLiveScreen";

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
