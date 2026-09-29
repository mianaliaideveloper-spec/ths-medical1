import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ths-soft px-5 py-12 text-center">
      <Image src="/logo.png" alt="" width={72} height={72} className="rounded-full bg-white object-contain ring-4 ring-white" />
      <h1 className="mt-6 text-2xl font-semibold text-ths-dark">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        This address is not part of THS Medical. Open the store home or sign in to continue.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-clinic px-4 py-2.5 text-sm font-semibold text-white hover:bg-clinic-dark"
        >
          Home
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ths-dark hover:bg-ths-soft"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ths-dark hover:bg-ths-soft"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
