import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaveProfileButton } from "@/components/profile/SaveProfileButton";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

const saveProfileAction = vi.fn();
const unsaveProfileAction = vi.fn();
const refresh = vi.fn();

vi.mock("@/features/profile/favouriteActions", () => ({
  saveProfileAction: (...args: unknown[]) => saveProfileAction(...args),
  unsaveProfileAction: (...args: unknown[]) => unsaveProfileAction(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function renderButton(props: Partial<React.ComponentProps<typeof SaveProfileButton>> = {}) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <SaveProfileButton username="luciav60" initiallySaved={false} {...props} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  saveProfileAction.mockReset().mockResolvedValue({ success: true });
  unsaveProfileAction.mockReset().mockResolvedValue({ success: true });
  refresh.mockReset();
});

describe("SaveProfileButton", () => {
  it("saves and shows it as saved", async () => {
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: es.favorites.save }));
    expect(saveProfileAction).toHaveBeenCalledWith("luciav60");
    expect(screen.getByRole("button", { name: es.favorites.unsave })).toHaveAttribute("aria-pressed", "true");
  });

  it("unsaves, and refreshes the list when asked to", async () => {
    renderButton({ initiallySaved: true, refreshOnChange: true });
    await userEvent.click(screen.getByRole("button", { name: es.favorites.unsave }));
    expect(unsaveProfileAction).toHaveBeenCalledWith("luciav60");
    expect(refresh).toHaveBeenCalled();
  });

  it("puts itself back and says why when the server refuses", async () => {
    saveProfileAction.mockResolvedValue({ success: false, message: es.favorites.unavailable });
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: es.favorites.save }));
    expect(screen.getByRole("button", { name: es.favorites.save })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("alert")).toHaveTextContent(es.favorites.unavailable);
  });
});
