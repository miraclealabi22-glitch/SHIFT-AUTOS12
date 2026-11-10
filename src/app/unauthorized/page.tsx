import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050505] px-6 text-white">
      <section className="max-w-xl border border-[#303030] bg-[#0b0b0b] p-8 sm:p-12">
        <p className="mb-4 text-[10px] uppercase tracking-[0.3em] text-[#858585]">SHIFT / Access restricted</p>
        <h1 className="font-[var(--font-display)] text-3xl uppercase tracking-wide sm:text-5xl">Administrator access required</h1>
        <p className="mt-5 text-sm leading-6 text-[#aaa]">
          This account does not have the administrator role required to manage the catalogue.
        </p>
        <Link href="/discover" className="mt-8 inline-flex min-h-11 items-center border border-[#555] px-5 text-[10px] uppercase tracking-[0.16em] hover:border-white">
          Return to Discover
        </Link>
      </section>
    </main>
  );
}
