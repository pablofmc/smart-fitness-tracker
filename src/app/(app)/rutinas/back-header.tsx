import Link from "next/link";

export function BackHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link href="/rutinas" aria-label="Volver a Rutinas" className="flex size-11 items-center justify-center rounded-full bg-card">
        <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>
      <h1 className="text-2xl font-extrabold">{title}</h1>
    </div>
  );
}
