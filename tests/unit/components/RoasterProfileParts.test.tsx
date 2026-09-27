import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PublicCoffeesSection, RecommendedRecipeCard } from "@/components/profile/PublicProfileSections";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

const coffee = {
  id: "c1",
  name: "Guji Shakiso",
  roaster: "La Semilla",
  country: "Etiopía",
  process: "Lavado",
  hasRecipe: true,
  recipeMethod: "v60",
  recipeGrind: "19",
};

function withLocale(node: React.ReactNode) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      {node}
    </LocaleProvider>,
  );
}

describe("roaster profile parts", () => {
  it("draws a roaster as a square mark and a person as initials", () => {
    const { container, rerender } = render(<ProfileAvatar displayName="Lucía V60" username="luciav60" />);
    expect(container.textContent).toBe("LV");
    expect(container.firstElementChild).toHaveClass("rounded-full");
    rerender(<ProfileAvatar displayName="La Semilla" username="lasemilla" kind="roaster" />);
    expect(container.textContent).toBe("");
    expect(container.firstElementChild).toHaveClass("rounded-input");
  });

  it("titles a roaster's coffees as its catalogue and leads each card with the origin", () => {
    withLocale(<PublicCoffeesSection coffees={[coffee]} username="lasemilla" dict={es} asRoaster />);
    expect(screen.getByRole("heading", { name: es.publicProfile.roasterCoffees })).toBeInTheDocument();
    expect(screen.getByText("Etiopía · Lavado")).toBeInTheDocument();
    expect(screen.queryByText("La Semilla")).not.toBeInTheDocument();
  });

  it("shows the recommended recipe with a link to its details", () => {
    withLocale(
      <RecommendedRecipeCard
        coffeeName="Guji Shakiso"
        username="lasemilla"
        dict={es}
        attempt={{
          id: "a1",
          brewedOn: "2026-09-20",
          method: "v60",
          overallRating: 5,
          grind: "19",
          dose_g: 18,
          water_g: 290,
          target_weight_g: null,
          extraction_ms: 165000,
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: es.publicProfile.recommendedRecipe })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: es.publicProfile.seeDetail })).toHaveAttribute("href", "/u/lasemilla/attempts/a1");
  });
});
