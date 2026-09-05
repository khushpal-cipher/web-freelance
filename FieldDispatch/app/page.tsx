import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">FieldDispatch</h1>
      <p className="max-w-md text-muted-foreground">
        Travel-aware job scheduling for field-service teams.
      </p>
      <div className="flex gap-4">
        <Link href="/schedule" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          Dispatch Board
        </Link>
        <Link href="/my-jobs" className="rounded-md border border-border px-4 py-2">
          Technician View
        </Link>
      </div>
    </main>
  );
}
