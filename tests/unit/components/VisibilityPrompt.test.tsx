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

function renderPrompt(props: { currentHandle?: string | null; suggestedHandle?: string } = {}) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <VisibilityPrompt currentHandle={props.currentHandle ?? null} suggestedHandle={props.suggestedHandle ?? "marina"} />
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

  it("asks for a handle before going public, prefilled with the suggestion", async () => {
    renderPrompt({ suggestedHandle: "lucia_v60" });
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    expect(screen.getByRole("dialog", { name: es.publicProfile.handleStepTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(es.settings.handle)).toHaveValue("lucia_v60");

    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    expect(setVisibilityAction).toHaveBeenCalledWith({ visibility: "public", handle: "lucia_v60" });
    expect(screen.getByRole("dialog", { name: es.publicProfile.doneTitle })).toBeInTheDocument();
    expect(screen.getByText(es.publicProfile.doneBody)).toBeInTheDocument();
  });

  it("goes public straight away when the account already has a handle", async () => {
    renderPrompt({ currentHandle: "marina" });
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    expect(setVisibilityAction).toHaveBeenCalledWith({ visibility: "public" });
  });

  it("shows why a handle was refused and stays on the handle step", async () => {
    setVisibilityAction.mockResolvedValue({ success: false, field: "handle", message: es.publicProfile.handleTaken });
    renderPrompt();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.makePublic }));
    expect(screen.getByText(es.publicProfile.handleTaken)).toBeInTheDocument();
    expect(screen.getByLabelText(es.settings.handle)).toBeInTheDocument();
  });

  it("waits for a connection instead of asking offline", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    renderPrompt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
