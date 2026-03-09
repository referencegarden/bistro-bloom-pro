

## Plan: Restaurant Dashboard UI Overhaul

### Overview
Complete redesign of the restaurant dashboard with modern visuals, charts, better layout, and mobile responsiveness.

### Changes

#### 1. `src/components/StatCard.tsx` — Modern redesign
- Add gradient backgrounds with colored icon containers
- Add subtle shadow and hover animations
- Include trend indicators with percentage changes
- Use colored accents per card type (green for products, blue for purchases, orange for daily, purple for stock value)

#### 2. `src/pages/Dashboard.tsx` — Full restructure
- **Header**: Add greeting with current date, keep export button
- **Stats row**: Redesigned 4 stat cards with icons in colored circles, gradient accents
- **Charts section** (new): 
  - Area chart showing purchases over the last 7 days (using recharts, already installed)
  - Bar chart for stock value by top categories
- **Quick actions row**: Pending demands + In-stock demands cards with progress indicators and colored borders
- **Low stock alerts**: Redesigned as a table with severity indicators (color-coded rows based on how far below threshold), sortable
- **Mobile**: Stack all sections vertically, charts take full width, stat cards 2-column on tablet, 1-column on phone

#### 3. `src/components/DashboardCharts.tsx` — New component
- `PurchasesChart`: Area/line chart for last 7 days of purchases (fetches from `purchases` table grouped by date)
- `StockByCategoryChart`: Horizontal bar chart showing stock value per category
- Uses recharts `AreaChart`, `BarChart` with Tailwind-matching colors
- Responsive containers with `ResponsiveContainer`

#### 4. Layout improvements
- Better spacing and visual hierarchy
- Cards with subtle borders and shadows instead of flat look
- Consistent color palette using CSS variables

### Technical Details
- All charts use `recharts` (already installed)
- Dashboard data fetching extended to include daily purchases for last 7 days and stock by category
- No database changes needed — all data already available
- Mobile breakpoints: `sm` (2-col stats), `md` (charts side-by-side), `lg` (4-col stats)

