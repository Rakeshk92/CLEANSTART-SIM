# CleanStart Simulation Game (Full-Stack)

A full-stack business simulation game built with **Next.js (App Router + TypeScript)** and **Supabase (Auth + Postgres + RLS)**.

Players run a startup quarter-by-quarter by choosing:
- Unit price
- Engineers to hire
- Sales staff to hire
- Salary percentage (relative to industry average)
- Desk capacity (office seats)

The app simulates business outcomes (demand, units sold, revenue, payroll, profit, cash, and quality) and stores a permanent quarter-by-quarter history.

---

## Live Features Implemented

### ✅ Authentication (Supabase Auth)
- Users sign in and only see their own game data.
- The UI redirects to `/` if not logged in.

### ✅ Database + Security (Supabase Postgres + RLS)
Two tables are used:

#### `games` table (current game state)
Stores the active game for a user:
- `cash`, `engineers`, `sales_staff`, `desk_capacity`
- `product_quality`, `cumulative_profit`
- `current_year`, `current_quarter`
- `ended_at`, `end_reason` (`bankrupt` or `won`)

#### `quarters` table (quarter history)
Stores every quarter’s decisions and computed outcomes:
- Inputs: `price`, `hire_engineers`, `hire_sales`, `salary_pct`
- Outputs: `demand`, `units_sold`, `revenue`, `total_payroll`,
  `new_hire_cost`, `net_income`, `cash_end`, `quality_end`

**Row Level Security** ensures a user can only read/write their own records.

---

## Backend Logic

### `runQuarter()` Simulation Engine
The simulation engine computes quarterly outcomes based on:
- Price sensitivity
- Quality growth based on engineers
- Production capacity (engineers)
- Sales capacity (sales team)
- Payroll cost based on salary percentage
- Hiring cost per new hire

End conditions:
- **Lose** if cash ≤ 0 → `end_reason = "bankrupt"`
- **Win** when reaching the final year threshold → `end_reason = "won"`

### API Route: `/api/advance`
When the player clicks **Advance Quarter**, the frontend calls:
- `POST /api/advance`

The route:
1. Validates auth token
2. Loads the game row (RLS protected)
3. Enforces desk capacity server-side
4. Runs the simulation (`runQuarter`)
5. Inserts a new row in `quarters`
6. Updates the game state in `games`
7. Sets `ended_at` and `end_reason` if game ends

---

## Frontend UI

### Main Screen (`/game`)
Shows:
- Current Year / Quarter
- Cash, Quality, Headcount, Desk Capacity, Cumulative Profit
- Inputs to set decisions for next quarter
- Button to **Add Desk**
- Button to **Advance Quarter**
- Quarter History table
- Charts (Cash + Net Income) for recent quarters
- “Office” visualization mapping people to desks

### End Screen
When game ends, UI displays the final outcome:
- “Game ended: bankrupt / won”
- A **Start New Game** button to create a new run

---

## Setup Instructions (Run Locally)

### 1) Install dependencies
```bash
npm install



This project implements a full-stack business simulation game using Next.js and Supabase. The frontend is built with Next.js (App Router) and TypeScript, providing a clean UI for users to make quarterly decisions such as product price, hiring engineers/sales staff, salary percentage, and desk capacity. Client-side validation prevents invalid inputs before requests are sent.

The backend uses a Next.js API route (/api/advance) to securely process the simulation. The route authenticates the request using the user’s Supabase session token, loads the active game state, enforces desk capacity rules server-side, runs the simulation engine (runQuarter), writes a quarter history record, and updates the game state for the next quarter. The simulation computes demand, units sold (bounded by production/sales capacity), revenue, payroll, hiring costs, profit, cash balance, and product quality. Game-ending conditions are handled by setting ended_at and end_reason to support a final win/lose screen.

Supabase Postgres stores data in two tables: games for current state and quarters for historical results. Row Level Security (RLS) policies ensure users can only access their own games and quarter history. Charts and a quarter history table provide visibility into financial trends and decision outcomes over time.