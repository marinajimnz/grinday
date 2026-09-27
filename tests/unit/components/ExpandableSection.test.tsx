import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpandableSection } from "@/components/profile/ExpandableSection";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

function renderSection(count: number) {
  const items = Array.from({ length: count }, (_, i) => <li key={i}>Café {i + 1}</li>);
  return render(
    <LocaleProvider locale="es" dict={es}>
      <ExpandableSection title="Cafés" items={items} />
    </LocaleProvider>,
  );
}

describe("ExpandableSection", () => {
  it("shows the first four and a see-more on the title's line", async () => {
    renderSection(6);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    const toggle = screen.getByRole("button", { name: es.publicProfile.seeMore });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByRole("button", { name: es.publicProfile.seeLess })).toHaveAttribute("aria-expanded", "true");
  });

  it("has no see-more when everything already fits", () => {
    renderSection(4);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
