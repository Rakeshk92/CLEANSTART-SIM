# CleanStart Business Simulation Game

A full-stack business simulation game built with **Next.js, TypeScript, and Supabase**.

This application simulates running a startup company where the player makes strategic business decisions each quarter such as pricing a product, hiring employees, and managing salaries. The goal is to grow the company profitably without running out of cash.

The system calculates market demand, revenue, payroll costs, and profit based on the player’s decisions and stores the results for each quarter.

---

# Features

- User authentication using Supabase
- Persistent game state stored in database
- Quarter-by-quarter business simulation
- Hiring engineers and sales staff
- Product pricing strategy
- Salary adjustment relative to industry average
- Desk capacity management
- Automatic financial calculations (revenue, payroll, profit)
- Quarter history table
- Charts showing financial trends
- Office visualization of employees and desks
- Win / lose conditions
- Start new game functionality

---

# Tech Stack

Frontend
- Next.js (App Router)
- React
- TypeScript

Backend
- Next.js API Routes

Database
- Supabase (PostgreSQL)

Authentication
- Supabase Auth

Visualization
- Custom React charts

---

# Database Design

The application uses two main database tables.

## Games Table

Stores the current state of a user's simulation.

Fields include:

- id
- user_id
- cash
- engineers
- sales_staff
- desk_capacity
- product_quality
- cumulative_profit
- current_year
- current_quarter
- ended_at
- end_reason

Each user can have one active game.

---

## Quarters Table

Stores the historical results of every simulated quarter.

Fields include:

- game_id
- year
- quarter
- price
- hire_engineers
- hire_sales
- salary_pct
- demand
- units_sold
- revenue
- total_payroll
- new_hire_cost
- net_income
- cash_end
- quality_end

This allows the UI to display quarter history and charts.

---

# Game Rules

Each quarter the player decides:

- Product price
- Number of engineers to hire
- Number of sales staff to hire
- Salary percentage relative to industry average

The simulation then calculates:

- Market demand
- Units sold
- Revenue
- Payroll costs
- Hiring costs
- Net income
- Ending cash
- Product quality

The game continues quarter by quarter until:

- The company runs out of cash (bankruptcy)
- The player reaches the final simulation year (win condition)

---

# Setup Instructions

## 1 Install Dependencies

Run:
npm install


---

## 2 Configure Environment Variables

Create a file named `.env.local` in the root of the project.

Add:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

---

## 3 Run the Application

Start the development server:
npm run dev


Open the application:
http://localhost:3000


---

# Application Flow

1. User logs in using Supabase authentication.
2. If no active game exists, a new game is automatically created.
3. The player makes business decisions for the next quarter.
4. The frontend sends those decisions to the backend API.
5. The backend simulation engine calculates the business results.
6. The new quarter data is saved in the database.
7. The game state updates and charts refresh.

---

# Simulation Engine

The simulation engine calculates business outcomes using several factors:

Demand is influenced by:
- Product quality
- Price elasticity

Production capacity depends on:
- Number of engineers

Sales capacity depends on:
- Number of sales staff

Costs include:
- Payroll based on salary percentage
- Hiring costs for new employees

Profit is calculated as:
Net Income = Revenue - Payroll - Hiring Costs


The updated cash balance determines whether the game continues or ends.

---

# Security

Row Level Security (RLS) policies are enabled in Supabase to ensure:

- Users can only access their own game
- Users can only read their own quarter history
- Unauthorized access to other users' data is prevented

---

# Approach

This project implements a full-stack business simulation game using Next.js and Supabase. The primary goal was to create a clean architecture that separates frontend interaction, backend simulation logic, and persistent storage. The frontend is built using Next.js with React and TypeScript, providing a simple interface where users can input business decisions for each quarter such as price, hiring engineers or sales staff, and adjusting salary levels. Client-side validation ensures that inputs are valid before sending requests to the backend.

The backend logic is implemented using a Next.js API route that processes the simulation when the player advances a quarter. The API authenticates the request using the Supabase session token, loads the current game state from the database, and runs the simulation engine to calculate demand, revenue, payroll expenses, hiring costs, net income, and product quality updates. The results are then stored in a quarters table while the current game state is updated in the games table.

Supabase PostgreSQL is used for persistent storage and authentication. Row Level Security policies ensure that users can only access their own game data. The UI displays key financial metrics, quarter history, and charts to help visualize business performance over time.

---

# Author

Rakesh Reddy