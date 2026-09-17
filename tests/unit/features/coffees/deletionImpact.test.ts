import { describe, expect, it } from "vitest";
import { formatDeletionImpact } from "@/features/coffees/deletionImpact";
import es from "@/lib/i18n/dictionaries/es";

describe("formatDeletionImpact", () => {
  it("names both bags and attempts", () => {
    expect(formatDeletionImpact(es, { bags: 2, attempts: 14 })).toBe(
      "Se eliminarán también 2 bolsas y 14 intentos, con sus fotos.",
    );
  });

  it("uses the singular for a count of one", () => {
    expect(formatDeletionImpact(es, { bags: 1, attempts: 1 })).toBe(
      "Se eliminarán también 1 bolsa y 1 intento, con sus fotos.",
    );
  });

  it("drops the half that's empty instead of saying '0 bolsas'", () => {
    expect(formatDeletionImpact(es, { bags: 0, attempts: 3 })).toBe(
      "Se eliminarán también 3 intentos, con sus fotos.",
    );
  });

  it("omits bags entirely when the caller is deleting a bag, not a coffee", () => {
    expect(formatDeletionImpact(es, { attempts: 2 })).toBe(
      "Se eliminarán también 2 intentos, con sus fotos.",
    );
  });

  it("reassures rather than listing zeroes when there's no history", () => {
    expect(formatDeletionImpact(es, { bags: 0, attempts: 0 })).toBe(
      "Todavía no tiene historial que perder.",
    );
  });
});
