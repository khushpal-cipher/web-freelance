import type { LatLng } from "./travel";

export type ScheduledJob = {
  id: string;
  lat: number;
  lng: number;
  startAt: Date;
  durationMins: number;
};

export type CandidateJob = {
  lat: number;
  lng: number;
  startAt: Date;
  durationMins: number;
};

export type Verdict = "OK" | "TIGHT" | "CONFLICT";

export type ConflictReason = {
  type: "TIME_OVERLAP" | "TRAVEL_INFEASIBLE" | "TRAVEL_TIGHT";
  withJobId?: string;
  message: string;
  slackMins?: number;
};

export type ConflictResult = {
  verdict: Verdict;
  reasons: ConflictReason[];
};

const TIGHT_THRESHOLD_MINS = 10;

function endOf(job: { startAt: Date; durationMins: number }): Date {
  return new Date(job.startAt.getTime() + job.durationMins * 60_000);
}

function overlaps(a: { startAt: Date; durationMins: number }, b: { startAt: Date; durationMins: number }) {
  return a.startAt < endOf(b) && b.startAt < endOf(a);
}

/**
 * Checks whether `candidate` can be added to a technician's existing (sorted or
 * unsorted) job list — both for direct time overlap and for whether the tech can
 * physically travel from the adjacent job(s) in the available gap.
 *
 * `getTravelMinutes` is injected so tests can mock distances without hitting a
 * real API.
 */
export async function checkConflict(
  candidate: CandidateJob,
  existingJobs: ScheduledJob[],
  getTravelMinutes: (a: LatLng, b: LatLng) => Promise<number>,
): Promise<ConflictResult> {
  const reasons: ConflictReason[] = [];

  for (const job of existingJobs) {
    if (overlaps(candidate, job)) {
      reasons.push({
        type: "TIME_OVERLAP",
        withJobId: job.id,
        message: `Time overlaps with job ${job.id}`,
      });
    }
  }

  const sorted = [...existingJobs].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const prev = sorted.filter((j) => endOf(j) <= candidate.startAt).at(-1);
  const next = sorted.filter((j) => j.startAt >= endOf(candidate)).at(0);

  if (prev) {
    const gapMins = (candidate.startAt.getTime() - endOf(prev).getTime()) / 60_000;
    const travelMins = await getTravelMinutes({ lat: prev.lat, lng: prev.lng }, { lat: candidate.lat, lng: candidate.lng });
    const slack = gapMins - travelMins;
    if (slack < 0) {
      reasons.push({
        type: "TRAVEL_INFEASIBLE",
        withJobId: prev.id,
        message: `Only ${Math.round(gapMins)}min after job ${prev.id}, but travel takes ~${travelMins}min`,
        slackMins: slack,
      });
    } else if (slack < TIGHT_THRESHOLD_MINS) {
      reasons.push({
        type: "TRAVEL_TIGHT",
        withJobId: prev.id,
        message: `Only ${Math.round(slack)}min of slack after traveling from job ${prev.id}`,
        slackMins: slack,
      });
    }
  }

  if (next) {
    const gapMins = (next.startAt.getTime() - endOf(candidate).getTime()) / 60_000;
    const travelMins = await getTravelMinutes({ lat: candidate.lat, lng: candidate.lng }, { lat: next.lat, lng: next.lng });
    const slack = gapMins - travelMins;
    if (slack < 0) {
      reasons.push({
        type: "TRAVEL_INFEASIBLE",
        withJobId: next.id,
        message: `Only ${Math.round(gapMins)}min before job ${next.id}, but travel takes ~${travelMins}min`,
        slackMins: slack,
      });
    } else if (slack < TIGHT_THRESHOLD_MINS) {
      reasons.push({
        type: "TRAVEL_TIGHT",
        withJobId: next.id,
        message: `Only ${Math.round(slack)}min of slack before traveling to job ${next.id}`,
        slackMins: slack,
      });
    }
  }

  const hasHardConflict = reasons.some((r) => r.type === "TIME_OVERLAP" || r.type === "TRAVEL_INFEASIBLE");
  const hasTight = reasons.some((r) => r.type === "TRAVEL_TIGHT");

  return {
    verdict: hasHardConflict ? "CONFLICT" : hasTight ? "TIGHT" : "OK",
    reasons,
  };
}
