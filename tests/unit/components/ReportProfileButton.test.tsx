import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportProfileButton } from "@/components/profile/ReportProfileButton";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

const reportProfileAction = vi.fn();
vi.mock("@/features/moderation/actions", () => ({
  reportProfileAction: (...args: unknown[]) => reportProfileAction(...args),
}));

function renderButton() {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <ReportProfileButton username="impostora" />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  reportProfileAction.mockReset().mockResolvedValue({ success: true });
});

describe("ReportProfileButton", () => {
  it("needs a reason, sends it with the details, and thanks without saying more", async () => {
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: es.report.open }));
    expect(screen.getByText(es.report.intro)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: es.report.send }));
    expect(screen.getByRole("alert")).toHaveTextContent(es.report.invalid);
    expect(reportProfileAction).not.toHaveBeenCalled();

    await userEvent.click(screen.getByLabelText(es.report.reasons.impersonation));
    await userEvent.type(screen.getByLabelText(es.report.details), "Usa el logo de La Semilla");
    await userEvent.click(screen.getByRole("button", { name: es.report.send }));
    expect(reportProfileAction).toHaveBeenCalledWith({
      username: "impostora",
      reason: "impersonation",
      details: "Usa el logo de La Semilla",
    });
    expect(screen.getByRole("dialog", { name: es.report.thanks })).toBeInTheDocument();
  });

  it("shows the daily limit when it's reached", async () => {
    reportProfileAction.mockResolvedValue({ success: false, message: es.report.tooMany });
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: es.report.open }));
    await userEvent.click(screen.getByLabelText(es.report.reasons.spam));
    await userEvent.click(screen.getByRole("button", { name: es.report.send }));
    expect(screen.getByRole("alert")).toHaveTextContent(es.report.tooMany);
  });
});
