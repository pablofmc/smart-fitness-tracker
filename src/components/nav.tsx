"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoy", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/actividades", label: "Actividad", icon: "M3 12h4l3-8 4 16 3-8h4" },
  { href: "/tendencias", label: "Tendencias", icon: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  {
    href: "/correlaciones",
    label: "Patrones",
    icon: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6.5 16l4-7.5M13.5 9l4 3.5",
  },
  { href: "/ajustes", label: "Ajustes", icon: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Bottom tab bar on phones, side menu from md up. */
export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-nav-line bg-nav pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:left-0 md:right-auto md:w-56 md:border-t-0 md:border-r md:px-3 md:pt-6"
    >
      <ul className="grid grid-cols-5 gap-1 px-3 pt-2 pb-3.5 md:flex md:flex-col md:p-0">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[52px] flex-col items-center justify-center gap-[3px] rounded-2xl text-[11px] font-bold outline-primary focus-visible:outline-2 md:h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm ${
                  active ? "bg-nav-on text-on-nav-on" : "text-muted hover:text-ink"
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
