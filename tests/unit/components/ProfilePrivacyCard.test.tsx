import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePrivacyCard } from "@/components/settings/ProfilePrivacyCard";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

const setVisibilityAction = vi.fn();

vi.mock("@/features/profile/actions", () => ({
  setVisibilityAction: (...args: unknown[]) => setVisibilityAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderCard(props: Partial<React.ComponentProps<typeof ProfilePrivacyCard>> = {}) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <ProfilePrivacyCard visibility="public" username="marinajimnz" {...props} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  setVisibilityAction.mockReset().mockResolvedValue({ success: true });
});

describe("ProfilePrivacyCard", () => {
  it("makes a public profile private in one tap, with no confirmation", async () => {
    renderCard();
    expect(screen.getByText(es.publicProfile.statusPublic)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePrivate }));
    expect(setVisibilityAction).toHaveBeenCalledWith({ visibility: "private" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers an undo once it's private", async () => {
    const { rerender } = renderCard();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePrivate }));
    rerender(
      <LocaleProvider locale="es" dict={es}>
        <ProfilePrivacyCard visibility="private" username="marinajimnz" />
      </LocaleProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(es.publicProfile.madePrivate);
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.undo }));
    expect(setVisibilityAction).toHaveBeenLastCalledWith({ visibility: "public" });
  });

  it("asks before going public and shows what will be seen", async () => {
    renderCard({ visibility: "private" });
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublicCta }));
    expect(screen.getByRole("dialog", { name: es.publicProfile.confirmPublicTitle })).toBeInTheDocument();
    expect(screen.getByText(es.publicProfile.neverShared)).toBeInTheDocument();
    expect(setVisibilityAction).not.toHaveBeenCalled();
  });

  it("treats an unanswered account as private, and names the public @ when going public", async () => {
    renderCard({ visibility: "unset" });
    expect(screen.getByText(es.publicProfile.statusPrivate)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublicCta }));
    expect(screen.getByText(es.publicProfile.foundAs.replace("{username}", "marinajimnz"))).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    expect(setVisibilityAction).toHaveBeenCalledWith({ visibility: "public" });
  });
});
