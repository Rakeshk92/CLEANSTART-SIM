"use client";

import QuarterChart from "@/components/QuarterChart";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Office from "@/components/Office";
import supabaseBrowser from "@/lib/supabaseClient";

type GameRow = {
  id: string;
  user_id: string;
  ended_at: string | null;
  end_reason: string | null;
  current_year: number;
  current_quarter: number;
  cash: number;
  engineers: number;
  sales_staff: number;
  product_quality: number;
  cumulative_profit: number;
  desk_capacity: number;
};

type QuarterRow = {
  id: string;
  game_id: string;
  year: number;
  quarter: number;

  price: number;
  hire_engineers: number;
  hire_sales: number;
  salary_pct: number;

  demand: number;
  units_sold: number;
  revenue: number;
  total_payroll: number;
  new_hire_cost: number;
  net_income: number;
  cash_end: number;
  quality_end: number;

  created_at: string;
};

export default function GamePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quarter history
  const [quarters, setQuarters] = useState<QuarterRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Decision inputs (for NEXT quarter)
  const [price, setPrice] = useState(200);
  const [hireEng, setHireEng] = useState(0);
  const [hireSales, setHireSales] = useState(0);
  const [salaryPct, setSalaryPct] = useState(100);

  const loadQuarterHistory = async (gameId: string) => {
    setHistoryLoading(true);

    const { data, error } = await supabase
      .from("quarters")
      .select("*")
      .eq("game_id", gameId)
      .order("year", { ascending: true })
      .order("quarter", { ascending: true });

    if (error) {
      setError(error.message);
      setHistoryLoading(false);
      return;
    }

    setQuarters((data ?? []) as QuarterRow[]);
    setHistoryLoading(false);
  };

  const loadGame = async () => {
    setLoading(true);
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    const user = authData.user;
    if (!user) {
      router.replace("/");
      return;
    }

    // Get existing active game
    const { data: existing, error: selErr } = await supabase
      .from("games")
      .select("*")
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selErr) {
      setError(selErr.message);
      setLoading(false);
      return;
    }

    let g = existing as GameRow | null;

    // Create if none exists
    if (!g) {
      const { data: created, error: insErr } = await supabase
        .from("games")
        .insert({
          user_id: user.id,
          cash: 300000,
          engineers: 4,
          sales_staff: 2,
          desk_capacity: 10,
          product_quality: 50,
          cumulative_profit: 0,
          current_year: 1,
          current_quarter: 1,
        })
        .select("*")
        .single();

      if (insErr) {
        setError(insErr.message);
        setLoading(false);
        return;
      }

      g = created as GameRow;
    }

    setGame(g);
    await loadQuarterHistory(g.id);
    setLoading(false);
  };

  useEffect(() => {
    loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start a new game (useful after win/lose, and for testing)
  const startNewGame = async () => {
    setError(null);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return setError(authErr.message);

    const user = authData.user;
    if (!user) return router.replace("/");

    const { data: created, error: insErr } = await supabase
      .from("games")
      .insert({
        user_id: user.id,
        cash: 300000,
        engineers: 4,
        sales_staff: 2,
        desk_capacity: 10,
        product_quality: 50,
        cumulative_profit: 0,
        current_year: 1,
        current_quarter: 1,
      })
      .select("*")
      .single();

    if (insErr) return setError(insErr.message);

    const newGame = created as GameRow;
    setGame(newGame);
    setQuarters([]);
    await loadQuarterHistory(newGame.id);

    // reset decisions ( fixed)
    setPrice(200);
    setHireEng(0);
    setHireSales(0);
    setSalaryPct(100);
  };

  // Add a desk (increase capacity)
  const addDesk = async () => {
    if (!game) return;
    setError(null);

    const newCap = game.desk_capacity + 1;

    const { data, error: updErr } = await supabase
      .from("games")
      .update({ desk_capacity: newCap })
      .eq("id", game.id)
      .select("*")
      .single();

    if (updErr) return setError(updErr.message);

    setGame(data as GameRow);
  };

  const advanceQuarter = async () => {
    if (!game) return;
    setError(null);

    // Input validation (client-side)
    if (price <= 0) return setError("Price must be greater than 0.");
    if (salaryPct < 50 || salaryPct > 200) return setError("Salary % must be between 50 and 200.");
    if (hireEng < 0 || hireSales < 0) return setError("Hiring values cannot be negative.");

    const newHeadcount = game.engineers + game.sales_staff + hireEng + hireSales;
    if (newHeadcount > game.desk_capacity) {
      return setError("Not enough desks for that many hires. Increase desk capacity or hire fewer people.");
    }

    const { data: sessionData, error: sesErr } = await supabase.auth.getSession();
    if (sesErr) return setError(sesErr.message);

    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/");
      return;
    }

    const res = await fetch("/api/advance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        game_id: game.id,
        price,
        hire_engineers: hireEng,
        hire_sales: hireSales,
        salary_pct: salaryPct,
      }),
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j?.error ?? "Advance failed");
      return;
    }

    setGame(j.game as GameRow);

    // refresh history
    await loadQuarterHistory(game.id);

    // reset decisions
    setHireEng(0);
    setHireSales(0);
  };

  if (loading) return <div style={{ padding: 16 }}>Loading game...</div>;
  if (!game) return <div style={{ padding: 16 }}>No game found.</div>;

  const ended = !!game.ended_at;
  const lastQuarter = quarters[quarters.length - 1];
  const last4 = quarters.slice(-4);

  return (
    <div style={{ padding: 16 }}>
      <h2>
        Year {game.current_year} • Q{game.current_quarter}
      </h2>

      {/* Inline error (does NOT hide the page) */}
      {error && <div style={{ marginTop: 10, color: "red" }}>{error}</div>}

      <div style={{ marginTop: 8 }}>
        <div>Cash: ${Math.round(game.cash).toLocaleString()}</div>
        <div>Quality: {Math.round(game.product_quality)}</div>
        <div>Engineers: {game.engineers}</div>
        <div>Sales: {game.sales_staff}</div>
        <div>Cumulative Profit: ${Math.round(game.cumulative_profit).toLocaleString()}</div>
        <div>Desk capacity: {game.desk_capacity}</div>
      </div>

      {/* Last Quarter Result Summary */}
      {lastQuarter && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
          <strong>
            Last Quarter Results (Y{lastQuarter.year} Q{lastQuarter.quarter})
          </strong>
          <div style={{ marginTop: 6 }}>Demand: {Math.round(lastQuarter.demand)}</div>
          <div>Units sold: {lastQuarter.units_sold}</div>
          <div>Revenue: ${Math.round(lastQuarter.revenue).toLocaleString()}</div>
          <div>Payroll: ${Math.round(lastQuarter.total_payroll).toLocaleString()}</div>
          <div>Hiring cost: ${Math.round(lastQuarter.new_hire_cost).toLocaleString()}</div>
          <div>Net income: ${Math.round(lastQuarter.net_income).toLocaleString()}</div>
          <div>Cash end: ${Math.round(lastQuarter.cash_end).toLocaleString()}</div>
          <div>Quality end: {Math.round(lastQuarter.quality_end)}</div>
        </div>
      )}

      {/* ✅ Final Screen (Win/Lose UI) */}
      {ended && (
        <div style={{ marginTop: 14, padding: 14, border: "2px solid #ddd", borderRadius: 12 }}>
          <h3 style={{ margin: 0 }}>
            {game.end_reason === "won" ? "🎉 You won!" : "💥 Game over"}
          </h3>

          <div style={{ marginTop: 8 }}>
            <div>
              <b>Reason:</b> {game.end_reason}
            </div>
            <div>
              <b>Final Year/Quarter:</b> Y{game.current_year} Q{game.current_quarter}
            </div>
            <div>
              <b>Final Cash:</b> ${Math.round(game.cash).toLocaleString()}
            </div>
            <div>
              <b>Cumulative Profit:</b> ${Math.round(game.cumulative_profit).toLocaleString()}
            </div>
          </div>

          <button onClick={startNewGame} style={{ marginTop: 12, padding: 10 }}>
            Start New Game
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, maxWidth: 420, display: "grid", gap: 10 }}>
        <label>
          Unit price
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            style={{ width: "100%", padding: 8 }}
            disabled={ended}
          />
        </label>

        <label>
          Hire engineers
          <input
            type="number"
            value={hireEng}
            onChange={(e) => setHireEng(Number(e.target.value))}
            style={{ width: "100%", padding: 8 }}
            disabled={ended}
          />
        </label>

        <label>
          Hire sales
          <input
            type="number"
            value={hireSales}
            onChange={(e) => setHireSales(Number(e.target.value))}
            style={{ width: "100%", padding: 8 }}
            disabled={ended}
          />
        </label>

        <label>
          Salary (% of industry avg)
          <input
            type="number"
            value={salaryPct}
            onChange={(e) => setSalaryPct(Number(e.target.value))}
            style={{ width: "100%", padding: 8 }}
            disabled={ended}
          />
        </label>

        <button onClick={addDesk} disabled={ended} style={{ padding: 10 }}>
          + Desk
        </button>

        <button onClick={advanceQuarter} disabled={ended} style={{ padding: 10 }}>
          Advance Quarter
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <Office engineers={game.engineers} sales={game.sales_staff} capacity={game.desk_capacity} />
      </div>

      {/*  Charts: Last 4 quarters */}
      {last4.length >= 2 && (
        <>
          <QuarterChart
            title="Cash (last 4 quarters)"
            points={last4.map((q) => ({
              label: `Y${q.year}Q${q.quarter}`,
              value: q.cash_end,
            }))}
          />

          <QuarterChart
            title="Net Income (last 4 quarters)"
            points={last4.map((q) => ({
              label: `Y${q.year}Q${q.quarter}`,
              value: q.net_income,
            }))}
          />
        </>
      )}

      {/* Quarter History */}
      <div style={{ marginTop: 24 }}>
        <h3>Quarter History</h3>

        {historyLoading ? (
          <div>Loading history...</div>
        ) : quarters.length === 0 ? (
          <div>No quarters yet. Advance once to generate history.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr>
                  {[
                    "Year",
                    "Q",
                    "Price",
                    "Hire Eng",
                    "Hire Sales",
                    "Salary %",
                    "Demand",
                    "Units",
                    "Revenue",
                    "Payroll",
                    "Hire Cost",
                    "Net",
                    "Cash End",
                    "Quality End",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #ddd",
                        padding: 8,
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {quarters.map((q) => (
                  <tr key={q.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.year}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.quarter}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      ${Math.round(q.price).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.hire_engineers}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.hire_sales}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{Math.round(q.salary_pct)}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{Math.round(q.demand)}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{q.units_sold}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      ${Math.round(q.revenue).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      ${Math.round(q.total_payroll).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      ${Math.round(q.new_hire_cost).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      ${Math.round(q.net_income).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      ${Math.round(q.cash_end).toLocaleString()}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{Math.round(q.quality_end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}