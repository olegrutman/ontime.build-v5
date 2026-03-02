

# Remove Chart from Materials Budget Status Dialog

## What's Being Removed

The "Budget vs Actual" chart inside the expanded dialog of `MaterialsBudgetStatusCard.tsx` (lines 174-196 approximately).

## Change

### `src/components/project/MaterialsBudgetStatusCard.tsx`
- Delete the "Budget vs Actual Chart" section inside the Dialog (lines 174-196): the `h4` heading, the `ChartContainer`, `LineChart`, `CartesianGrid`, `XAxis`, `YAxis`, `ChartTooltip`, `ReferenceLine`, and both `Line` elements
- Remove unused imports: `LineChart`, `Line`, `XAxis`, `YAxis`, `ReferenceLine`, `CartesianGrid`, `ResponsiveContainer` from recharts, and `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from chart UI -- only keep what the sparkline on the collapsed card still uses (`LineChart`, `Line`, `ReferenceLine`, `ResponsiveContainer`)
- Remove unused `chartConfig` constant since it's only used by the dialog chart

Everything else (collapsed card with sparkline, forecast summary, tables, risk factors) stays as-is.

