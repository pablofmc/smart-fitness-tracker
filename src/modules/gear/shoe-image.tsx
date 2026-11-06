"use client";

import { useEffect, useRef, useState } from "react";

/** Side view of a generic shoe, shown when a shoe has no image or its link breaks (R-GEAR-02). */
export function GenericShoe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" role="img" aria-label="Zapatilla sin imagen" className={`fill-none stroke-current text-muted ${className ?? ""}`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 29c0-8 2-15 6-17l8 5 6-7c6 8 16 11 28 12 5 1 8 4 8 7z" />
      <path d="M4 29h56v3a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
      <path d="M27 14l3 3M31 16l3 3" />
    </svg>
  );
}

/** A shoe's photo or catalog image on a white tile; falls back to the drawing on a missing or broken link. */
export function ShoeImage({ src, className }: { src: string | null; className: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const img = useRef<HTMLImageElement>(null);
  const show = src && broken !== src;
  // An image that failed before hydration never fires onError in React: check it once mounted.
  useEffect(() => {
    const el = img.current;
    if (src && el?.complete && el.naturalWidth === 0) setBroken(src);
  }, [src]);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${show ? "bg-white" : "bg-sunk"} ${className}`}>
      {show ? (
        // Catalog images and signed photo URLs are already small WebP files; next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src={src} alt="" className="size-full object-contain" onError={() => setBroken(src)} />
      ) : (
        <GenericShoe className="w-2/3" />
      )}
    </span>
  );
}
