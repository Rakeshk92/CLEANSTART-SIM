export type Decisions = {
  price: number;          // price per unit (recommend: 50 - 500 range)
  hire_engineers: number;
  hire_sales: number;
  salary_pct: number;     // % of industry avg (50 - 200)
};

export type GameState = {
  cash: number;
  engineers: number;
  sales_staff: number;
  product_quality: number; // 0..100
  current_year: number;
  current_quarter: number; // 1..4
  cumulative_profit: number;
};

export type QuarterResult = {
  salary_cost_per_person: number;
  demand: number;
  units_sold: number;
  revenue: number;
  total_payroll: number;
  new_hire_cost: number;
  net_income: number;
  cash_end: number;
  quality_end: number;
  next_year: number;
  next_quarter: number;
  ended: boolean;
  end_reason: null | "bankrupt" | "won";
};

// --- Tunables (adjust if you want different difficulty) ---
const INDUSTRY_AVG_SALARY_ANNUAL = 120000; // annual salary
const HIRE_COST_PER_PERSON = 5000;

// Capacity
const UNITS_PER_ENGINEER_PER_QUARTER = 250; // production capacity
const UNITS_PER_SALES_PER_QUARTER = 300;    // sales throughput

// Demand model
const BASE_MARKET_SIZE = 4000;          // baseline quarterly demand at decent quality/price
const QUALITY_DEMAND_MULT = 0.012;      // quality -> demand lift
const PRICE_REFERENCE = 200;            // "normal" price anchor
const PRICE_ELASTICITY = 1.2;           // >1 means price matters more
const QUALITY_GAIN_PER_ENGINEER = 0.6;  // quality gain per engineer per quarter
const QUALITY_DECAY = 0.5;              // optional small decay (keeps it from pegging 100)

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function runQuarter(state: GameState, d: Decisions): QuarterResult {
  const price = Math.max(1, Number(d.price));
  const hireEng = Math.max(0, Math.floor(Number(d.hire_engineers)));
  const hireSales = Math.max(0, Math.floor(Number(d.hire_sales)));
  const salaryPct = clamp(Number(d.salary_pct), 0, 1000);

  // Headcount after hires (hires take effect immediately for simplicity)
  const engineers = state.engineers + hireEng;
  const sales = state.sales_staff + hireSales;

  // Salary is annual -> convert to quarterly
  const salaryAnnual = (salaryPct / 100) * INDUSTRY_AVG_SALARY_ANNUAL;
  const salaryCostPerPerson = salaryAnnual / 4;

  // Quality evolves (slight decay prevents always hitting 100 too fast)
  const qualityRaw = state.product_quality + engineers * QUALITY_GAIN_PER_ENGINEER - QUALITY_DECAY;
  const qualityEnd = clamp(qualityRaw, 0, 100);

  // Demand curve:
  // - increases with quality
  // - decreases with price using elasticity
  const qualityLift = 1 + qualityEnd * QUALITY_DEMAND_MULT; // e.g. 0.. ~2.2x
  const priceFactor = Math.pow(PRICE_REFERENCE / price, PRICE_ELASTICITY); // >1 if cheaper, <1 if expensive
  const demand = Math.max(0, BASE_MARKET_SIZE * qualityLift * priceFactor);

  // Capacity constraints
  const productionCap = engineers * UNITS_PER_ENGINEER_PER_QUARTER;
  const salesCap = sales * UNITS_PER_SALES_PER_QUARTER;

  const unitsSold = Math.floor(Math.max(0, Math.min(demand, productionCap, salesCap)));

  const revenue = price * unitsSold;
  const totalPayroll = salaryCostPerPerson * (engineers + sales);
  const newHireCost = (hireEng + hireSales) * HIRE_COST_PER_PERSON;

  const netIncome = revenue - totalPayroll - newHireCost;
  const cashEnd = state.cash + netIncome;

  // Advance time
  let nextQuarter = state.current_quarter + 1;
  let nextYear = state.current_year;
  if (nextQuarter === 5) {
    nextQuarter = 1;
    nextYear += 1;
  }

  // End conditions
  let ended = false;
  let end_reason: QuarterResult["end_reason"] = null;

  if (cashEnd <= 0) {
  ended = true;
  end_reason = "bankrupt";
} else if (nextYear === 11 && cashEnd > 0) {
  ended = true;
  end_reason = "won";

}

  return {
    salary_cost_per_person: salaryCostPerPerson,
    demand,
    units_sold: unitsSold,
    revenue,
    total_payroll: totalPayroll,
    new_hire_cost: newHireCost,
    net_income: netIncome,
    cash_end: cashEnd,
    quality_end: qualityEnd,
    next_year: nextYear,
    next_quarter: nextQuarter,
    ended,
    end_reason,
  };
}