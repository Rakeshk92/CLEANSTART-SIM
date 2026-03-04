import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runQuarter } from "@/lib/simulate";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const body = await req.json();
    const { game_id, price, hire_engineers, hire_sales, salary_pct } = body;

    if (!game_id) {
      return NextResponse.json({ error: "Missing game_id" }, { status: 400 });
    }

    // Create Supabase client that runs as the user (RLS applies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    // 1) Load game (RLS ensures user can only read their own)
    const { data: game, error: gErr } = await supabase
      .from("games")
      .select("*")
      .eq("id", game_id)
      .single();

    if (gErr || !game) {
      return NextResponse.json({ error: gErr?.message || "Game not found" }, { status: 404 });
    }

    if (game.ended_at) {
      return NextResponse.json({ error: "Game already ended" }, { status: 409 });
    }

    // 2) Sanitize inputs once (use everywhere)
    const priceNum = Number(price);
    const salaryPctNum = Number(salary_pct);
    const hireEngNum = Math.max(0, Math.floor(Number(hire_engineers)));
    const hireSalesNum = Math.max(0, Math.floor(Number(hire_sales)));

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return NextResponse.json({ error: "Price must be > 0" }, { status: 400 });
    }

    if (!Number.isFinite(salaryPctNum) || salaryPctNum < 50 || salaryPctNum > 200) {
      return NextResponse.json({ error: "Salary % must be between 50 and 200" }, { status: 400 });
    }

    // 3) Server-side desk capacity enforcement
    const currentPeople = Number(game.engineers) + Number(game.sales_staff);
    const futurePeople = currentPeople + hireEngNum + hireSalesNum;
    const capacity = Number(game.desk_capacity);

    if (futurePeople > capacity) {
      return NextResponse.json(
        { error: "Not enough desks for that many hires. Increase desk capacity or hire fewer people." },
        { status: 400 }
      );
    }

    // 4) Prevent duplicate quarter insert (unique: game_id + year + quarter)
    const year = Number(game.current_year);
    const quarter = Number(game.current_quarter);

    const { data: existingQuarter, error: existingErr } = await supabase
      .from("quarters")
      .select("id")
      .eq("game_id", game.id)
      .eq("year", year)
      .eq("quarter", quarter)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    if (existingQuarter) {
      return NextResponse.json(
        { error: `Quarter Y${year} Q${quarter} already exists for this game.` },
        { status: 409 }
      );
    }

    // 5) Run simulation (server-side only)
    const result = runQuarter(
      {
        cash: Number(game.cash),
        engineers: Number(game.engineers),
        sales_staff: Number(game.sales_staff),
        product_quality: Number(game.product_quality),
        current_year: Number(game.current_year),
        current_quarter: Number(game.current_quarter),
        cumulative_profit: Number(game.cumulative_profit),
      },
      {
        price: priceNum,
        hire_engineers: hireEngNum,
        hire_sales: hireSalesNum,
        salary_pct: salaryPctNum,
      }
    );

    // 6) Insert quarter history
    const { error: qErr } = await supabase.from("quarters").insert({
      game_id: game.id,
      year,
      quarter,

      price: priceNum,
      hire_engineers: hireEngNum,
      hire_sales: hireSalesNum,
      salary_pct: salaryPctNum,

      salary_cost_per_person: result.salary_cost_per_person,
      demand: result.demand,
      units_sold: result.units_sold,
      revenue: result.revenue,
      total_payroll: result.total_payroll,
      new_hire_cost: result.new_hire_cost,
      net_income: result.net_income,
      cash_end: result.cash_end,
      quality_end: result.quality_end,
    });

    if (qErr) {
      return NextResponse.json({ error: qErr.message }, { status: 500 });
    }

    // 7) Update game state
    const newCume = Number(game.cumulative_profit) + result.net_income;

    const updatePayload: any = {
      cash: result.cash_end,
      engineers: Number(game.engineers) + hireEngNum,
      sales_staff: Number(game.sales_staff) + hireSalesNum,
      product_quality: result.quality_end,
      current_year: result.next_year,
      current_quarter: result.next_quarter,
      cumulative_profit: newCume,
    };

    if (result.ended) {
      updatePayload.ended_at = new Date().toISOString();
      updatePayload.end_reason = result.end_reason;
    }

    const { data: updatedGame, error: uErr } = await supabase
      .from("games")
      .update(updatePayload)
      .eq("id", game.id)
      .select("*")
      .single();

    if (uErr || !updatedGame) {
      return NextResponse.json({ error: uErr?.message || "Failed to update game" }, { status: 500 });
    }

    return NextResponse.json({ game: updatedGame });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}