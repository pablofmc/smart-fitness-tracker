/** Placeholder for a section whose milestone hasn't been built yet. */
export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="text-[28px] font-extrabold">{title}</h1>
      <p className="rounded-[20px] bg-card px-[18px] py-6 text-center text-[15px] text-muted">{text}</p>
    </div>
  );
}
