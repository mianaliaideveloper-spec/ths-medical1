import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#0f4d33_0%,#156b47_42%,#1a4f8b_100%)] text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Taleem-o-Hunar Society logo" width={64} height={64} className="h-16 w-16 max-w-none rounded-full bg-white object-contain" priority />
          <div>
            <p className="text-sm font-semibold">Taleem-o-Hunar Society</p>
            <p className="text-xs text-white/75">Medical Center</p>
          </div>
        </div>
        <Link href="/login" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-ths-dark">
          Admin sign in
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">Medicine store</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
            One inventory for every medicine in the center.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-white/85">
            Track stock, expiry, suppliers, and purchase value from a single desk. Built for the Taleem-o-Hunar Medical Center pharmacy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-clinic-dark">
              Login to store desk
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Live stock", "Quantities update as stock is received or issued."],
            ["Expiry watch", "See expired and near-expiry batches together."],
            ["Suppliers", "Keep manufacturer and supplier records with each item."],
            ["Reports", "Export the inventory to Excel or PDF."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-white/80">{body}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
