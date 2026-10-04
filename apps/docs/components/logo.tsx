import type { SVGProps } from "react";

/** The site's icon, app/icon.svg, inline. */
export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect x="2" y="6" width="28" height="18" rx="3" fill="#4f46e5" />
      <rect x="7" y="11" width="12" height="2.5" rx="1.25" fill="#fff" />
      <rect x="7" y="16" width="18" height="2.5" rx="1.25" fill="#c7c4ff" />
      <rect x="14" y="24" width="4" height="3" fill="#4f46e5" />
      <rect x="10" y="27" width="12" height="2" rx="1" fill="#4f46e5" />
    </svg>
  );
}
