import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

function renderTile(props: Partial<React.ComponentProps<typeof PhotoTile>> = {}) {
  const onRemove = vi.fn();
  render(
    <LocaleProvider locale="es" dict={es}>
      <PhotoTile src="/photo.jpg" alt="Espresso" onRemove={onRemove} {...props} />
    </LocaleProvider>,
  );
  return { onRemove };
}

describe("PhotoTile", () => {
  // jsdom computes no media queries, so the class list is what actually
  // pins this: the point is that nothing hides the button unconditionally.
  it("does not hide the remove control on a device that cannot hover", () => {
    renderTile();
    const button = screen.getByRole("button", { name: es.ui.deletePhoto });

    expect(button.className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
    expect(button.className).toContain("[@media(hover:hover)]:opacity-0");
    expect(button.className).toContain("[@media(hover:hover)]:group-hover:opacity-100");
  });

  it("removes the photo when it is pressed", async () => {
    const { onRemove } = renderTile();

    await userEvent.click(screen.getByRole("button", { name: es.ui.deletePhoto }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("stays put while a removal is in flight", async () => {
    const { onRemove } = renderTile({ disabled: true });

    await userEvent.click(screen.getByRole("button", { name: es.ui.deletePhoto }));

    expect(onRemove).not.toHaveBeenCalled();
  });

  it("has no remove control when the photo is read-only", () => {
    render(
      <LocaleProvider locale="es" dict={es}>
        <PhotoTile src="/photo.jpg" alt="Paquete" />
      </LocaleProvider>,
    );

    expect(screen.getByRole("img", { name: "Paquete" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.ui.deletePhoto })).not.toBeInTheDocument();
  });
});
