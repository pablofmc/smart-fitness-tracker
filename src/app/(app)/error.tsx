"use client";

/** R-OPS-03: a paused or unreachable backend is shown, not hidden behind a crash. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="flex flex-col gap-2 rounded-[20px] bg-warn-bg px-[18px] py-4">
      <h1 className="text-[15px] font-extrabold text-warn">No pudimos cargar tus datos</h1>
      <p className="text-sm leading-[1.45] text-warn-text">
        La base de datos no respondió. Si la app lleva días sin actividad, Supabase pudo haberla pausado: revísala en su panel. Mientras tanto la
        sincronización tampoco corre.
      </p>
      <button type="button" onClick={reset} className="h-11 self-start rounded-full bg-warn-btn px-4 text-sm font-bold text-on-warn-btn">
        Reintentar
      </button>
    </section>
  );
}
