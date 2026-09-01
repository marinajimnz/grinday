import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Coffee } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={Coffee}
        title="Sin cafés todavía"
        description="Añade tu primer café para empezar."
      />,
    );

    expect(screen.getByText("Sin cafés todavía")).toBeInTheDocument();
    expect(
      screen.getByText("Añade tu primer café para empezar."),
    ).toBeInTheDocument();
  });
});
