"use client";

type Point = { label: string; value: number };

export default function QuarterChart({
  title,
  points,
}: {
  title: string;
  points: Point[];
}) {
  if (points.length < 2) return null;

  const w = 520;
  const h = 140;
  const pad = 20;

  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);

  const xFor = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const yFor = (v: number) => h - pad - ((v - min) * (h - pad * 2)) / span;

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.value)}`)
    .join(" ");

  return (
    <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <strong>{title}</strong>

      <svg width={w} height={h} style={{ display: "block", marginTop: 10 }}>
        {/* axes */}
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#ddd" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#ddd" />

        {/* line */}
        <path d={d} fill="none" stroke="black" strokeWidth={2} />

        {/* points */}
        {points.map((p, i) => (
          <circle key={p.label} cx={xFor(i)} cy={yFor(p.value)} r={3} fill="black" />
        ))}
      </svg>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, opacity: 0.85 }}>
        {points.map((p) => (
          <div key={p.label}>
            {p.label}: {Math.round(p.value).toLocaleString()}
          </div>
        ))}
      </div>
    </div>
  );
}