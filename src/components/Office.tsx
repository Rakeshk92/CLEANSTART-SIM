"use client";

type Props = {
  engineers: number;
  sales: number;
  capacity: number;

  onHireEngineer?: () => void;
  onHireSales?: () => void;
  onAddDesk?: () => void;
};

export default function Office({
  engineers,
  sales,
  capacity,
  onHireEngineer,
  onHireSales,
  onAddDesk,
}: Props) {
  const filled = engineers + sales;
  const cap = Math.max(capacity, filled);
  const desks = Array.from({ length: cap }, (_, i) => i);

  const engEnd = Math.min(engineers, cap);
  const salesEnd = Math.min(engineers + sales, cap);

  return (
    <div style={{ marginTop: 12 }}>
      {/* Optional quick controls inside Office */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <button onClick={onHireEngineer} disabled={!onHireEngineer}>
          + Engineer
        </button>
        <button onClick={onHireSales} disabled={!onHireSales}>
          + Sales
        </button>
        <button onClick={onAddDesk} disabled={!onAddDesk}>
          + Desk
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Legend color="#e6f0ff" label={`Engineering (${engineers})`} />
        <Legend color="#e9ffe6" label={`Sales/Admin (${sales})`} />
        <Legend color="#fafafa" label={`Empty (${Math.max(0, cap - filled)})`} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 8,
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
        }}
      >
        {desks.map((i) => {
          let bg = "#fafafa";
          let label = "Empty";

          if (i < engEnd) {
            bg = "#e6f0ff";
            label = "Eng";
          } else if (i < salesEnd) {
            bg = "#e9ffe6";
            label = "Sales";
          }

          // Click behavior:
          // - Click an empty desk to add desk capacity (optional)
          // - Click an Eng desk to add Engineer (optional)
          // - Click a Sales desk to add Sales (optional)
          const onClick = () => {
            if (label === "Empty" && onAddDesk) return onAddDesk();
            if (label === "Eng" && onHireEngineer) return onHireEngineer();
            if (label === "Sales" && onHireSales) return onHireSales();
          };

          return (
            <div
              key={i}
              title={
                label === "Empty"
                  ? "Empty (click to add a desk)"
                  : `${label} (click to add another)`
              }
              onClick={onClick}
              style={{
                height: 46,
                borderRadius: 10,
                border: "1px solid #e5e5e5",
                background: bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                opacity: label === "Empty" ? 0.6 : 1,
                userSelect: "none",
              }}
            >
              {label === "Empty" ? "" : label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: color,
          border: "1px solid #ddd",
        }}
      />
      <span style={{ fontSize: 12, opacity: 0.85 }}>{label}</span>
    </div>
  );
}