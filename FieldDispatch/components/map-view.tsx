"use client";

type Point = { lat: number; lng: number; label: string; color: string };

const WIDTH = 320;
const HEIGHT = 240;
const PADDING = 20;

export function MapView({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">No locations yet</div>;
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  const project = (p: Point) => {
    const x = PADDING + ((p.lng - minLng) / lngRange) * (WIDTH - PADDING * 2);
    // lat increases northward but SVG y increases downward — flip it
    const y = PADDING + (1 - (p.lat - minLat) / latRange) * (HEIGHT - PADDING * 2);
    return { x, y };
  };

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-60 w-full rounded-md bg-muted" role="img" aria-label="Job locations map">
      {points.map((p, i) => {
        const { x, y } = project(p);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={5} fill={p.color} stroke="white" strokeWidth={1.5} />
            <text x={x} y={y - 8} fontSize={8} textAnchor="middle" fill="currentColor" className="fill-foreground">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
