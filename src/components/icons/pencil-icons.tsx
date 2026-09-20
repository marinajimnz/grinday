// Hand-drawn "pencil sketch" icon set, imported from the Claude Design
// project "SVG pencil-sketch coffee icons" (24x24 grid, 1.8 stroke).
// The roughness comes from an SVG feTurbulence/feDisplacementMap filter,
// so each icon stays a plain vector path — PencilIconDefs renders the
// three filter variants once globally; every icon below just references
// one of them by id.
import type { SVGProps } from "react";

export function PencilIconDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <filter id="pencil-a" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves={3} seed={11} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pencil-b" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves={3} seed={4} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pencil-c" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={23} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

type PencilFilter = "pencil-a" | "pencil-b" | "pencil-c";

function pencilIcon(
  filter: PencilFilter,
  paths: React.ReactNode,
  options?: { fill?: string; strokeWidth?: number },
) {
  function PencilIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={24}
        height={24}
        fill={options?.fill ?? "none"}
        stroke="currentColor"
        strokeWidth={options?.strokeWidth ?? 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filter})`}
        {...props}
      >
        {paths}
      </svg>
    );
  }
  return PencilIcon;
}

export const IconInicio = pencilIcon(
  "pencil-a",
  <>
    <path d="M3.2 10.6 L12 3.6 L20.8 10.6" />
    <path d="M5.4 9.4 V20.2 H18.6 V9.4" />
    <path d="M9.8 20.2 V14.4 H14.2 V20.2" />
  </>,
);

export const IconCafe = pencilIcon(
  "pencil-b",
  <>
    <path d="M4.6 8.6 H16.2 c0 6 -1.7 8.6 -5.8 8.6 -4.1 0 -5.8 -2.6 -5.8 -8.6 Z" />
    <path d="M16.4 10 c2.9 -0.7 3.7 0.6 3.7 2.2 0 1.7 -1.1 2.7 -3.3 2.4" />
    <path d="M7.7 5.8 V3.5" />
    <path d="M10.4 5.4 V2.9" />
    <path d="M13.1 5.8 V3.5" />
    <path d="M5.6 19.9 H15.2" />
  </>,
);

export const IconPreparar = pencilIcon(
  "pencil-a",
  <>
    <path d="M4.8 13.2 a7.2 7.2 0 1 0 14.4 0 a7.2 7.2 0 1 0 -14.4 0" />
    <path d="M12 13.2 V8.8" />
    <path d="M10 3.4 H14" />
    <path d="M12 3.4 V6" />
  </>,
);

export const IconEstadisticas = pencilIcon(
  "pencil-c",
  <>
    <path d="M4.4 4.3 H19.6 V19.7 H4.4 Z" />
    <path d="M7.6 9.1 H16.4" />
    <path d="M7.6 12.7 H16.4" />
    <path d="M7.6 16.3 H12.6" />
  </>,
);

export const IconAjustes = pencilIcon(
  "pencil-b",
  <>
    <path d="M6.2 12 a5.8 5.8 0 1 0 11.6 0 a5.8 5.8 0 1 0 -11.6 0" />
    <path d="M9.7 12 a2.3 2.3 0 1 0 4.6 0 a2.3 2.3 0 1 0 -4.6 0" />
    <g strokeWidth={3.1}>
      <path d="M17.6 12 H19.9" />
      <path d="M14.8 16.9 L15.9 18.9" />
      <path d="M9.2 16.9 L8.1 18.9" />
      <path d="M6.4 12 H4.1" />
      <path d="M9.2 7.1 L8.1 5.1" />
      <path d="M14.8 7.1 L15.9 5.1" />
    </g>
  </>,
);

export const IconEditar = pencilIcon(
  "pencil-a",
  <>
    <path d="M3.9 20.1 L5.2 15.8 L16.4 4.6 c1 -1 2.4 -1 3.4 0 1 1 1 2.4 0 3.4 L8.6 19.2 Z" />
    <path d="M14.6 6.4 L17.6 9.4" />
  </>,
);

export const IconArchivar = pencilIcon(
  "pencil-c",
  <>
    <path d="M3.6 5 H20.4 V8.9 H3.6 Z" />
    <path d="M5.3 8.9 V19.4 H18.7 V8.9" />
    <path d="M9.6 12.7 H14.4" />
  </>,
);

export const IconEliminar = pencilIcon(
  "pencil-a",
  <>
    <path d="M4.6 7.1 H19.4" />
    <path d="M6.6 7.1 L7.6 20 H16.4 L17.4 7.1" />
    <path d="M9.4 4 H14.6" />
    <path d="M10.3 10.6 V16.8" />
    <path d="M13.7 10.6 V16.8" />
  </>,
);

export const IconBuscar = pencilIcon(
  "pencil-b",
  <>
    <path d="M4.4 10.6 a6.2 6.2 0 1 0 12.4 0 a6.2 6.2 0 1 0 -12.4 0" />
    <path d="M15.2 15.2 L20 20" />
  </>,
);

export const IconAnadir = pencilIcon(
  "pencil-c",
  <>
    <path d="M4.4 12 a7.6 7.6 0 1 0 15.2 0 a7.6 7.6 0 1 0 -15.2 0" />
    <path d="M12 8 V16" />
    <path d="M8 12 H16" />
  </>,
);

export const IconFavorito = pencilIcon(
  "pencil-a",
  <path d="M12 20.2 C6 15.7 3.4 12.9 3.4 9.7 3.4 6.7 5.6 4.7 8.2 4.7 c1.6 0 3 0.8 3.8 2.2 0.8 -1.4 2.2 -2.2 3.8 -2.2 2.6 0 4.8 2 4.8 5 0 3.2 -2.6 6 -8.6 10.5 Z" />,
);

export const IconGrano = pencilIcon(
  "pencil-b",
  <>
    <path d="M12 3.6 c4.6 0 8.4 3.8 8.4 8.4 0 4.6 -3.8 8.4 -8.4 8.4 -4.6 0 -8.4 -3.8 -8.4 -8.4 0 -4.6 3.8 -8.4 8.4 -8.4 Z" />
    <path d="M8.2 19 C11 16 11.4 12.7 9.4 10.1 7.4 7.5 8.6 5.4 11.4 3.8" />
  </>,
);

export const IconBolsa = pencilIcon(
  "pencil-c",
  <>
    <path d="M8 6.7 C6.6 11 6.2 16 6.4 20.4 H17.6 C17.8 16 17.4 11 16 6.7" />
    <path d="M8 6.7 c1.5 -1.3 6.5 -1.3 8 0" />
    <path d="M7.7 4.3 H16.3" strokeWidth={3} />
    <path d="M9.4 12 H14.6 V15.6 H9.4 Z" />
  </>,
);

export const IconFlecha = pencilIcon(
  "pencil-a",
  <>
    <path d="M3.6 12 H19.4" />
    <path d="M13.4 5.9 L20.4 12 L13.4 18.1" />
  </>,
);

// Back, in the step line of the Preparar flow. A bare chevron, not the
// full arrow of IconFlecha: at 16px the shaft and head of that one collapse
// into a smudge.
export const IconChevronIzq = pencilIcon("pencil-c", <path d="M14.5 5 L7.5 12 L14.5 19" />, {
  strokeWidth: 2.4,
});

// IconBalanza, IconBuscar, IconHervidor and IconMetodo are not drawn
// anywhere right now, and deleting them costs more than keeping them: the
// four together are under a kilobyte, but removing them drops this module
// below the size at which the bundler keeps a shared chunk, and clsx +
// tailwind-merge (7.8 kB) get copied into five route entries instead of
// being fetched once. Measured: -0.9 kB of source, +14 kB downloaded on
// /, /coffees, /attempts/new and /offline. They also belong to a synced
// icon set, so the set staying whole is worth something on its own.

export const IconBalanza = pencilIcon(
  "pencil-c",
  <>
    <path d="M3.4 8.8 H20.6" />
    <path d="M12 8.8 V11" />
    <path d="M5.2 11 H18.8 V19.1 H5.2 Z" />
    <path d="M8.2 14.6 H11.8" />
  </>,
);

export const IconMetodo = pencilIcon(
  "pencil-a",
  <>
    <path d="M4.2 6.8 H19.8" />
    <path d="M5.6 6.8 L11 16.6 H13 L18.4 6.8" />
    <path d="M12 16.6 V20.2" />
    <path d="M9.2 20.2 H14.8" />
    <path d="M8.6 6.8 L11.6 12.2" />
    <path d="M15.4 6.8 L12.4 12.2" />
  </>,
);

export const IconHervidor = pencilIcon(
  "pencil-b",
  <>
    <path d="M5.6 10.2 H18.4 c0 6 -2.6 9.2 -6.4 9.2 -3.8 0 -6.4 -3.2 -6.4 -9.2 Z" />
    <path d="M18.3 11.6 L21.6 8.3" />
    <path d="M8.2 10.2 C8.6 5.3 15.4 5.3 15.8 10.2" />
    <path d="M12 5.7 V3.6" />
  </>,
);

export const IconPerfil = pencilIcon(
  "pencil-a",
  <>
    <path d="M2.8 6 H21.2 V18 H2.8 Z" />
    <path d="M7.1 10.6 a1.9 1.9 0 1 0 3.8 0 a1.9 1.9 0 1 0 -3.8 0" />
    <path d="M6.2 15.4 c0.8 -1.8 4.4 -1.8 5.2 0" />
    <path d="M14.2 10.4 H18.6" />
    <path d="M14.2 13.6 H18.6" />
  </>,
);

export const IconMaquinas = pencilIcon(
  "pencil-a",
  <>
    <path d="M4.4 4.4 H19.6 V13 H4.4 Z" />
    <path d="M8.6 13 H13.2 V15.6 H8.6 Z" />
    <path d="M13.2 14.4 H17.2" />
    <path d="M9 18.4 H12.8 c0 1.5 -0.85 2.2 -1.9 2.2 -1.05 0 -1.9 -0.7 -1.9 -2.2 Z" />
    <path d="M4.4 20.6 H19.6" />
    <path d="M7.4 8 H12.4" />
  </>,
);

export const IconCuenta = pencilIcon(
  "pencil-c",
  <>
    <path d="M8.4 8.2 a3.6 3.6 0 1 0 7.2 0 a3.6 3.6 0 1 0 -7.2 0" />
    <path d="M4.8 20.6 c0 -4.2 3.2 -6.8 7.2 -6.8 4 0 7.2 2.6 7.2 6.8" />
  </>,
);

// Espresso/V60/Chemex/Aeropress/Prensa/Moka/Otros below are pulled verbatim
// (same viewBox/stroke/pencil-filter spec) from Marina's "SVG pencil-sketch
// coffee icons" Claude Design project — icons/svg/{espresso,v60,chemex,
// aeropress,prensa,moka,otro}.svg — synced in for the brew-method picker.
export const IconEspresso = pencilIcon(
  "pencil-a",
  <>
    <path d="M4 4.4 H14.4 L13 9.2 H5.4 Z" />
    <path d="M14.2 6.4 H20.8" />
    <path d="M20.8 5.2 V7.6" />
    <path d="M9 9.2 V11.6" />
    <path d="M6 14.8 H13 C12.8 18.6 11.4 20.4 9.5 20.4 C7.6 20.4 6.2 18.6 6 14.8 Z" />
  </>,
);

export const IconV60 = pencilIcon(
  "pencil-b",
  <>
    <path d="M5.6 6.4 H18.4 L13 15.4 H11 Z" />
    <path d="M7.6 8.8 H16.4" />
    <path d="M9.6 9 L11.5 15.2" />
    <path d="M14.4 9 L12.5 15.2" />
    <path d="M12 17 V18.4" />
    <path d="M8.4 20.4 H15.6" />
  </>,
);

export const IconChemex = pencilIcon(
  "pencil-c",
  <>
    <path d="M7.6 3.6 H16.4" />
    <path d="M7.6 3.6 L10.4 11.6" />
    <path d="M16.4 3.6 L13.6 11.6" />
    <path d="M10.4 11.6 C7.4 13 6.4 16 8.1 18.3 C10 20.8 14 20.8 15.9 18.3 C17.6 16 16.6 13 13.6 11.6" />
    <path d="M8.5 9.4 H15.5 L14.7 11.4 H9.3 Z" />
  </>,
);

export const IconAeropress = pencilIcon(
  "pencil-a",
  <>
    <path d="M9.6 3.5 H14.4" />
    <path d="M12 3.5 V6.3" />
    <path d="M6.6 6.3 H17.4" />
    <path d="M7.7 6.3 L8.8 17.2 H15.2 L16.3 6.3" />
    <path d="M9.6 17.2 H14.4 V19.4 H9.6 Z" />
    <path d="M12 19.4 V20.8" />
  </>,
);

export const IconPrensa = pencilIcon(
  "pencil-b",
  <>
    <path d="M10.9 2.9 H13.1" />
    <path d="M12 2.9 V5.6" />
    <path d="M6.6 5.6 H17.4" />
    <path d="M7.6 5.6 V19.1 C7.6 20.1 8.2 20.5 9.2 20.5 H14.8 C15.8 20.5 16.4 20.1 16.4 19.1 V5.6" />
    <path d="M16.4 8.8 C19.3 8.8 19.3 14 16.4 14" />
    <path d="M8.6 11.4 H15.4" />
  </>,
);

export const IconMoka = pencilIcon(
  "pencil-c",
  <>
    <path d="M8.2 20.4 H15.8 L14.6 13.4 H9.4 Z" />
    <path d="M9.4 13.4 H14.6 L13.9 7.6 H10.1 Z" />
    <path d="M10.2 7.6 V6.1 H13.8 V7.6" />
    <path d="M13.9 8.8 L17.6 6.6" />
    <path d="M16.2 15 C19 15.5 19 18.6 16.2 19.1" />
  </>,
);

export const IconOtros = pencilIcon(
  "pencil-a",
  <>
    <path d="M6.6 7.6 H17.4 L13 16.2 H11 Z" />
    <path d="M9.9 11.3 H10" />
    <path d="M11.95 11.3 H12.05" />
    <path d="M14 11.3 H14.1" />
    <path d="M8.4 20.4 H15.6" />
  </>,
);

// Filled star — marks a favorite/preferred item. Unlike the other icons,
// the source SVG bakes fill="currentColor" in (not fill="none"); pass
// className="fill-none" to render just the outline for an "unstarred" state.
export const IconFavorita = pencilIcon(
  "pencil-a",
  <path d="M12 3.4 L14.8 9.2 L21.1 10.1 L16.5 14.5 L17.6 20.7 L12 17.7 L6.4 20.7 L7.5 14.5 L2.9 10.1 L9.2 9.2 Z" />,
  { fill: "currentColor", strokeWidth: 1.7 },
);
