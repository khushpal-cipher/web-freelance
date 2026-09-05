import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-accent">IntakeEngine</p>
      <h1 className="font-heading text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        Manual onboarding delays cash and drops clients.
      </h1>
      <p className="mt-4 max-w-xl text-base text-ink/70">
        IntakeEngine replaces the back-and-forth with one conditional intake form: it shows only the
        questions that apply, captures a signature, and provisions the account automatically —
        no one on your team has to touch it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/onboard/business-info">
          <Button>Start onboarding</Button>
        </Link>
        <Link href="/submissions">
          <Button variant="secondary">View dashboard</Button>
        </Link>
      </div>
    </main>
  );
}
