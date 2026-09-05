import { describe, expect, it } from "vitest";
import { checkConflict, type ScheduledJob } from "./conflict";

const jobA: ScheduledJob = {
  id: "a",
  lat: 40.0,
  lng: -75.0,
  startAt: new Date("2026-01-05T09:00:00Z"),
  durationMins: 60, // ends 10:00
};

describe("checkConflict", () => {
  it("flags a direct time overlap", async () => {
    const result = await checkConflict(
      { lat: 40.0, lng: -75.0, startAt: new Date("2026-01-05T09:30:00Z"), durationMins: 30 },
      [jobA],
      async () => 0,
    );
    expect(result.verdict).toBe("CONFLICT");
    expect(result.reasons.some((r) => r.type === "TIME_OVERLAP")).toBe(true);
  });

  it("flags CONFLICT when travel time exceeds the gap", async () => {
    // starts 10:15, only 15min after job A ends — mock says travel takes 45min
    const result = await checkConflict(
      { lat: 41.0, lng: -76.0, startAt: new Date("2026-01-05T10:15:00Z"), durationMins: 30 },
      [jobA],
      async () => 45,
    );
    expect(result.verdict).toBe("CONFLICT");
    expect(result.reasons.some((r) => r.type === "TRAVEL_INFEASIBLE")).toBe(true);
  });

  it("flags TIGHT when travel just barely fits (<10min slack)", async () => {
    // starts 10:20 (20min gap), travel takes 15min -> 5min slack
    const result = await checkConflict(
      { lat: 40.1, lng: -75.1, startAt: new Date("2026-01-05T10:20:00Z"), durationMins: 30 },
      [jobA],
      async () => 15,
    );
    expect(result.verdict).toBe("TIGHT");
  });

  it("returns OK when there is comfortable travel slack", async () => {
    // starts 11:00 (60min gap), travel takes 15min -> 45min slack
    const result = await checkConflict(
      { lat: 40.1, lng: -75.1, startAt: new Date("2026-01-05T11:00:00Z"), durationMins: 30 },
      [jobA],
      async () => 15,
    );
    expect(result.verdict).toBe("OK");
    expect(result.reasons).toHaveLength(0);
  });

  it("checks travel feasibility against both the prior and next job", async () => {
    const jobC: ScheduledJob = {
      id: "c",
      lat: 42.0,
      lng: -77.0,
      startAt: new Date("2026-01-05T10:30:00Z"), // 30min after candidate would end
      durationMins: 30,
    };
    // candidate: 10:00-10:15Z sits between jobA (ends 10:00) and jobC (starts 10:30)
    const result = await checkConflict(
      { lat: 40.5, lng: -75.5, startAt: new Date("2026-01-05T10:00:00Z"), durationMins: 15 },
      [jobA, jobC],
      async (a, b) => (b.lat === 42.0 ? 40 : 5), // long drive to jobC's location
    );
    expect(result.verdict).toBe("CONFLICT");
    expect(result.reasons.some((r) => r.withJobId === "c")).toBe(true);
  });
});
