import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:pb-10 md:pl-60 md:max-w-none">{children}</main>
      <Nav />
    </>
  );
}
