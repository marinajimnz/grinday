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

function pencilIcon(filter: PencilFilter, paths: React.ReactNode) {
  function PencilIcon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={24}
        height={24}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
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
