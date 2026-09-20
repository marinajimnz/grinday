import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating, StarRatingInput } from "@/components/ui/StarRating";

// The stars are the whole point, so the assertions go at the drawing: how
// many are filled, how many are hollow. "fill-none" is what empties one.
function starFills(container: HTMLElement) {
  return [...container.querySelectorAll("svg")].map((svg) =>
    svg.classList.contains("fill-none") ? "empty" : "filled",
  );
}

describe("StarRating", () => {
  it("fills as many stars as the score and hollows the rest", () => {
    const { container } = render(<StarRating value={3} />);
    expect(starFills(container)).toEqual(["filled", "filled", "filled", "empty", "empty"]);
  });

  it("always draws five, so the row itself says out of how many", () => {
    const { container } = render(<StarRating value={5} />);
    expect(starFills(container)).toEqual(Array(5).fill("filled"));
  });

  it("still reads as a number out loud", () => {
    // This replaced the literal text "4/5" on screen; a screen reader must
    // not be left counting shapes.
    render(<StarRating value={4} />);
    expect(screen.getByText("4/5")).toHaveClass("sr-only");
  });

  it("draws nothing for an unrated brew", () => {
    // Most of the 25 attempts already logged have no score.
    const { container } = render(<StarRating value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("StarRatingInput", () => {
  it("keeps the five radios named by their number", () => {
    // The digit is gone from the screen, so the accessible name is the
    // only thing left carrying it — and it is what the e2e specs click.
    render(<StarRatingInput id="r" label="Acidez" value={2} onChange={vi.fn()} />);

    const group = screen.getByRole("radiogroup", { name: "Acidez" });
    expect(group).toHaveAttribute("id", "r");
    for (const n of ["1", "2", "3", "4", "5"]) {
      expect(screen.getByRole("radio", { name: n })).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "2" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "3" })).not.toBeChecked();
  });

  it("shows an unrated scale as five hollow stars", () => {
    const { container } = render(
      <StarRatingInput id="r" label="Acidez" value={undefined} onChange={vi.fn()} />,
    );
    expect(starFills(container)).toEqual(Array(5).fill("empty"));
  });

  it("reports the star that was tapped", async () => {
    const onChange = vi.fn();
    render(<StarRatingInput id="r" label="Acidez" value={undefined} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "4" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
