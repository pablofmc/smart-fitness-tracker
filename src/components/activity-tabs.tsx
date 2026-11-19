import Link from "next/link";

/** "Actividades | Rutinas | Récords" at the top of the Actividad tab (canvas: C2-Rutinas, C2-Records). */
export function ActivityTabs({ current }: { current: "actividades" | "rutinas" | "records" }) {
  const tabs = [
    { key: "actividades", href: "/actividades", label: "Actividades" },
    { key: "rutinas", href: "/rutinas", label: "Rutinas" },
    { key: "records", href: "/records", label: "Récords" },
  ] as const;
  return (
    <nav aria-label="Actividad" className="grid max-w-xl grid-cols-3 gap-1 rounded-2xl bg-card p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={`flex h-10 items-center justify-center rounded-xl text-sm ${tab.key === current ? "bg-primary font-extrabold text-on-primary" : "font-bold text-ink-soft"}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
