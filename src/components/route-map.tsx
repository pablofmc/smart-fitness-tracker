"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { RoutePoint } from "@/lib/activities/fit";

type Mode = "ruta" | "ritmo";

const cssVar = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * The route on OpenStreetMap tiles (R-ACT-06). On the page the map doesn't take one-finger drags or
 * the scroll wheel, so scrolling past it works; full screen, it pans and zooms freely.
 */
export function RouteMap({ route, thirds, label }: { route: RoutePoint[]; thirds: (0 | 1 | 2 | null)[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [mode, setMode] = useState<Mode>("ruta");
  const [full, setFull] = useState(false);
  const hasPace = thirds.some((t) => t !== null);

  useEffect(() => {
    let cancelled = false;
    let instance: LeafletMap | null = null;
    import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      instance = L.map(box.current, { zoomControl: false, scrollWheelZoom: full, dragging: full || !L.Browser.mobile, attributionControl: true });
      map.current = instance;
      instance.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(instance);
      if (full) L.control.zoom({ position: "bottomleft" }).addTo(instance);

      const primary = cssVar("--primary", "#0f766e");
      const pace = [cssVar("--pace-fast", "#2563eb"), cssVar("--pace-mid", "#94a3b8"), cssVar("--pace-slow", "#ea580c")];
      const latlngs = route.map((p) => [p.lat, p.lon] as [number, number]);
      if (mode === "ritmo" && hasPace) {
        for (let i = 0; i < latlngs.length - 1; i++) {
          L.polyline([latlngs[i], latlngs[i + 1]], { color: thirds[i] === null ? pace[1] : pace[thirds[i]!], weight: 5, lineCap: "round" }).addTo(instance);
        }
      } else {
        L.polyline(latlngs, { color: primary, weight: 5, lineCap: "round", lineJoin: "round" }).addTo(instance);
      }
      L.circleMarker(latlngs[0], { radius: 7, color: primary, weight: 3, fillColor: "#ffffff", fillOpacity: 1 }).bindTooltip("Salida").addTo(instance);
      L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: "#ffffff", weight: 2, fillColor: "#15201e", fillOpacity: 1 }).bindTooltip("Llegada").addTo(instance);
      instance.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
    });
    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
    };
  }, [route, thirds, mode, full, hasPace]);

  useEffect(() => {
    if (!full) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [full]);

  const chip = (value: Mode, text: string) => (
    <button type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`h-9 rounded-full px-3.5 text-[13px] font-bold ${mode === value ? "bg-primary text-on-primary" : "bg-field"}`}>
      {text}
    </button>
  );

  return (
    <section className={full ? "fixed inset-0 z-50 flex flex-col gap-2 bg-bg p-2" : "flex flex-col gap-2.5 rounded-3xl bg-card p-2"}>
      <div className={`relative overflow-hidden rounded-[18px] bg-field ${full ? "grow" : "h-[300px]"}`}>
        <div ref={box} role="img" aria-label={label} className="absolute inset-0" />
        <button
          type="button"
          onClick={() => setFull(!full)}
          aria-label={full ? "Cerrar el mapa" : "Ver el mapa a pantalla completa"}
          className="absolute top-2.5 right-2.5 z-[1000] flex size-11 items-center justify-center rounded-full bg-card shadow"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            {full ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pb-1.5">
        {hasPace ? (
          <div role="group" aria-label="Color de la ruta" className="flex gap-1.5">
            {chip("ruta", "Ruta")}
            {chip("ritmo", "Por ritmo")}
          </div>
        ) : (
          <span />
        )}
        {mode === "ritmo" && hasPace ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <span className="size-2.5 rounded-[3px]" style={{ background: "var(--pace-fast)" }} />
            rápido
            <span className="ml-1 size-2.5 rounded-[3px]" style={{ background: "var(--pace-slow)" }} />
            lento
          </span>
        ) : (
          <span className="flex items-center gap-2.5 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full border-2 border-primary" />
              salida
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-ink" />
              llegada
            </span>
          </span>
        )}
      </div>
    </section>
  );
}
