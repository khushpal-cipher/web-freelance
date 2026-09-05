"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/map-view";

type Technician = { id: string; name: string; phone: string | null; homeLat: number; homeLng: number };
type Job = {
  id: string;
  technicianId: string | null;
  title: string;
  address: string;
  lat: number;
  lng: number;
  startAt: string;
  durationMins: number;
  status: string;
};
type ConflictReason = { type: string; withJobId?: string; message: string; slackMins?: number };
type AssignResult = { assigned: boolean; verdict: "OK" | "TIGHT" | "CONFLICT"; reasons: ConflictReason[] };

const TECH_COLORS = ["#d97757", "#3b82f6", "#10b981", "#a855f7", "#f59e0b"];

function verdictVariant(v: string) {
  if (v === "OK") return "ok" as const;
  if (v === "TIGHT") return "tight" as const;
  return "conflict" as const;
}

export default function SchedulePage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedTech, setSelectedTech] = useState<Record<string, string>>({});
  const [assignResults, setAssignResults] = useState<Record<string, AssignResult>>({});
  const [assigning, setAssigning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [techRes, jobsRes] = await Promise.all([fetch("/api/technicians"), fetch("/api/jobs")]);
    const techData = await techRes.json();
    const jobsData = await jobsRes.json();
    setTechnicians(techData.technicians);
    setJobs(jobsData.jobs);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAssign(jobId: string, force = false) {
    const technicianId = selectedTech[jobId];
    if (!technicianId) return;
    setAssigning(jobId);
    const res = await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, technicianId, force }),
    });
    const data: AssignResult = await res.json();
    setAssignResults((prev) => ({ ...prev, [jobId]: data }));
    setAssigning(null);
    if (data.assigned) {
      await load();
    }
  }

  const techById = Object.fromEntries(technicians.map((t) => [t.id, t]));
  const unassigned = jobs.filter((j) => j.status === "UNASSIGNED");

  const mapPoints = [
    ...technicians.map((t, i) => ({
      lat: t.homeLat,
      lng: t.homeLng,
      label: `${t.name.split(" ")[0]} (base)`,
      color: TECH_COLORS[i % TECH_COLORS.length],
    })),
    ...jobs
      .filter((j) => j.technicianId)
      .map((j) => {
        const idx = technicians.findIndex((t) => t.id === j.technicianId);
        return { lat: j.lat, lng: j.lng, label: j.title.slice(0, 12), color: TECH_COLORS[idx % TECH_COLORS.length] };
      }),
  ];

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading dispatch board…</div>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatch Board</h1>
          <p className="text-sm text-muted-foreground">Travel-aware scheduling — not just the clock.</p>
        </div>
        <Link href="/my-jobs" className="text-sm underline">
          Technician view →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {technicians.map((tech, i) => {
              const techJobs = jobs
                .filter((j) => j.technicianId === tech.id)
                .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
              return (
                <Card key={tech.id} className="p-4" data-testid={`tech-column-${tech.id}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: TECH_COLORS[i % TECH_COLORS.length] }}
                    />
                    <h2 className="font-semibold">{tech.name}</h2>
                  </div>
                  <div className="space-y-2">
                    {techJobs.length === 0 && <p className="text-xs text-muted-foreground">No jobs today</p>}
                    {techJobs.map((job) => (
                      <div key={job.id} className="rounded-md border border-border p-2 text-sm">
                        <div className="font-medium">{job.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(job.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
                          {job.durationMins}min
                        </div>
                        <div className="text-xs text-muted-foreground">{job.address}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="mt-6 p-4">
            <h2 className="mb-3 font-semibold">Map</h2>
            <MapView points={mapPoints} />
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Unassigned Jobs ({unassigned.length})</h2>
          <div className="space-y-4">
            {unassigned.length === 0 && <p className="text-sm text-muted-foreground">All jobs assigned.</p>}
            {unassigned.map((job) => {
              const result = assignResults[job.id];
              return (
                <div key={job.id} className="rounded-md border border-border p-3" data-testid="unassigned-job">
                  <div className="font-medium text-sm">{job.title}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {job.address} · {new Date(job.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ·{" "}
                    {job.durationMins}min
                  </div>
                  <select
                    className="w-full rounded-md border border-border bg-background p-1.5 text-sm mb-2"
                    value={selectedTech[job.id] ?? ""}
                    onChange={(e) => setSelectedTech((prev) => ({ ...prev, [job.id]: e.target.value }))}
                    aria-label={`Assign technician for ${job.title}`}
                  >
                    <option value="">Choose technician…</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!selectedTech[job.id] || assigning === job.id}
                    onClick={() => handleAssign(job.id)}
                  >
                    {assigning === job.id ? "Checking…" : "Check & Assign"}
                  </Button>

                  {result && (
                    <div className="mt-2 space-y-1" data-testid="assign-result">
                      <Badge variant={verdictVariant(result.verdict)}>{result.verdict}</Badge>
                      {result.reasons.map((r, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {r.message}
                        </p>
                      ))}
                      {!result.assigned && result.verdict === "CONFLICT" && (
                        <Button
                          variant="ghost"
                          className="mt-1 w-full text-xs text-destructive"
                          onClick={() => handleAssign(job.id, true)}
                        >
                          Force assign anyway
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </main>
  );
}
