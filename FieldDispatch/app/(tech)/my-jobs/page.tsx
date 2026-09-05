"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Technician = { id: string; name: string };
type Job = {
  id: string;
  technicianId: string | null;
  title: string;
  address: string;
  startAt: string;
  durationMins: number;
  status: string;
};

export default function MyJobsPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selected, setSelected] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [techRes, jobsRes] = await Promise.all([fetch("/api/technicians"), fetch("/api/jobs")]);
      const techData = await techRes.json();
      const jobsData = await jobsRes.json();
      setTechnicians(techData.technicians);
      setJobs(jobsData.jobs);
      if (techData.technicians[0]) setSelected(techData.technicians[0].id);
      setLoading(false);
    })();
  }, []);

  const myJobs = jobs
    .filter((j) => j.technicianId === selected)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">My Jobs</h1>
        <Link href="/schedule" className="text-sm underline">
          Dispatch board →
        </Link>
      </div>

      <select
        className="mb-4 w-full rounded-md border border-border bg-background p-2 text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        aria-label="Select technician"
      >
        {technicians.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <div className="space-y-3">
        {myJobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs scheduled.</p>}
        {myJobs.map((job) => (
          <Card key={job.id} className="p-3" data-testid="my-job-card">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">
                {new Date(job.startAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
              <Badge variant="neutral">{job.status}</Badge>
            </div>
            <div className="font-medium">{job.title}</div>
            <div className="text-sm text-muted-foreground">{job.address}</div>
            <div className="text-xs text-muted-foreground">{job.durationMins} min</div>
          </Card>
        ))}
      </div>
    </main>
  );
}
