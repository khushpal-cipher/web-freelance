import { prisma } from "@/lib/db";
import { signPath } from "@/lib/signedUrl";
import { Card } from "@/components/ui/card";
import type { FormData } from "@/lib/forms/schema";

export const dynamic = "force-dynamic";

// ponytail: no auth guard on this route — fine for a demo, add session-based
// access control before this ever holds real client data.

function statusLabel(status: string) {
  switch (status) {
    case "PROVISIONED":
      return { text: "Provisioned", className: "bg-green-100 text-green-800" };
    case "SIGNED":
      return { text: "Signed", className: "bg-amber-100 text-amber-800" };
    default:
      return { text: "In progress", className: "bg-ink/10 text-ink/60" };
  }
}

export default async function SubmissionsPage() {
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    include: { provisionedAccount: true },
    take: 100,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <h1 className="font-heading text-2xl font-semibold text-ink">Submissions</h1>
      <p className="mt-1 text-sm text-ink/60">Every onboarding session, live as clients complete them.</p>

      <div className="mt-8 space-y-3">
        {submissions.length === 0 && (
          <Card className="text-center text-sm text-ink/50">No submissions yet — start one at /onboard/business-info.</Card>
        )}

        {submissions.map((s) => {
          const data = s.data as FormData;
          const badge = statusLabel(s.status);
          const sigUrl = s.signatureUrl
            ? (() => {
                const { expires, signature } = signPath(s.signatureUrl!);
                return `${s.signatureUrl}?expires=${expires}&sig=${signature}`;
              })()
            : null;

          return (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-ink">{(data.businessName as string) || "Untitled"}</p>
                <p className="text-xs text-ink/50">
                  {(data.businessType as string) ?? "—"} · created {s.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.text}</span>
                {sigUrl && (
                  <a href={sigUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-accent hover:underline">
                    View signature
                  </a>
                )}
                {s.provisionedAccount?.welcomeSentAt && (
                  <span className="text-xs text-ink/40">Welcome sent</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
