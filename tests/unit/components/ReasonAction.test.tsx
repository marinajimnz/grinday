import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReasonAction } from "@/components/admin/ReasonAction";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function renderAction(run: (reason: string) => Promise<{ success: true } | { success: false; message: string }>) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <ReasonAction label="Suspender perfil" run={run} />
    </LocaleProvider>,
  );
}

describe("ReasonAction", () => {
  it("needs a reason and a confirmation before running", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    renderAction(run);
    await userEvent.click(screen.getByRole("button", { name: "Suspender perfil" }));
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: es.admin.confirm })).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox"), "Suplanta a una tostadora");
    await userEvent.click(screen.getByRole("button", { name: es.admin.confirm }));
    expect(run).toHaveBeenCalledWith("Suplanta a una tostadora");
    expect(screen.getByRole("status")).toHaveTextContent(es.admin.done);
  });

  it("keeps the form open and shows the refusal", async () => {
    renderAction(vi.fn().mockResolvedValue({ success: false, message: es.admin.errorNotAllowed }));
    await userEvent.click(screen.getByRole("button", { name: "Suspender perfil" }));
    await userEvent.type(screen.getByRole("textbox"), "x");
    await userEvent.click(screen.getByRole("button", { name: es.admin.confirm }));
    expect(screen.getByRole("alert")).toHaveTextContent(es.admin.errorNotAllowed);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
