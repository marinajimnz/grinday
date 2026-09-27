import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VisibilityPrompt } from "@/components/profile/VisibilityPrompt";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

const setVisibilityAction = vi.fn();
const refresh = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("@/features/profile/actions", () => ({
  setVisibilityAction: (...args: unknown[]) => setVisibilityAction(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => searchParams,
}));

function renderPrompt(username: string | null = "marinajimnz") {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <VisibilityPrompt username={username} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  setVisibilityAction.mockReset().mockResolvedValue({ success: true });
  refresh.mockReset();
  searchParams = new URLSearchParams();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("VisibilityPrompt", () => {
  it("shows both answers, what's shared and how to go back to private", () => {
    renderPrompt();
    expect(screen.getByRole("dialog", { name: es.publicProfile.promptTitle })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.publicProfile.makePublic })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.publicProfile.stayPrivate })).toBeInTheDocument();
    expect(screen.getByText(es.publicProfile.neverShared)).toBeInTheDocument();
    expect(screen.getByText(es.publicProfile.changeLater)).toBeInTheDocument();
  });

  it("says the username becomes the public @ before anyone chooses", () => {
    renderPrompt("marinajimnz");
    expect(screen.getByText(es.publicProfile.foundAs.replace("{username}", "marinajimnz"))).toBeInTheDocument();
  });

  it("greets a new account instead of announcing a change", () => {
    searchParams = new URLSearchParams("bienvenida");
    renderPrompt();
    expect(screen.getByRole("dialog", { name: es.publicProfile.promptWelcomeTitle })).toBeInTheDocument();
  });

  it("can't be dismissed with Escape", async () => {
    renderPrompt();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(setVisibilityAction).not.toHaveBeenCalled();
  });

  it("saves private and closes", async () => {
    renderPrompt();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.stayPrivate }));
    expect(setVisibilityAction).toHaveBeenCalledWith({ visibility: "private" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("goes public and then reminds how to go back to private", async () => {
    renderPrompt();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    expect(setVisibilityAction).toHaveBeenCalledWith({ visibility: "public" });
    expect(screen.getByRole("dialog", { name: es.publicProfile.doneTitle })).toBeInTheDocument();
    expect(screen.getByText(es.publicProfile.doneBody)).toBeInTheDocument();
  });

  it("shows why going public was refused and keeps both answers available", async () => {
    setVisibilityAction.mockResolvedValue({ success: false, message: es.publicProfile.usernameReserved });
    renderPrompt("admin");
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    expect(screen.getByText(es.publicProfile.usernameReserved)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.publicProfile.stayPrivate })).toBeEnabled();
  });

  it("waits for a connection instead of asking offline", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    renderPrompt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
