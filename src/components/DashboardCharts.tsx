import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PurchasesChartProps {
  data: { date: string; total: number }[];
}

export function PurchasesChart({ data }: PurchasesChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Achats - 7 derniers jours</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[240px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(163, 38%, 16%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(163, 38%, 16%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value.toFixed(2)} DH`, "Total"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(160, 84%, 39%)"
                strokeWidth={2}
                fill="url(#purchaseGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface StockByCategoryChartProps {
  data: { name: string; value: number }[];
}

const barColors = [
  "hsl(160, 84%, 39%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(263, 70%, 50%)",
  "hsl(350, 89%, 60%)",
  "hsl(190, 80%, 45%)",
];

export function StockByCategoryChart({ data }: StockByCategoryChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Stock par Catégorie</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[240px] sm:h-[280px] flex flex-col justify-center">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Aucune donnée disponible
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item, index) => {
                const percentage = total > 0 ? ((item.value / total) * 100) : 0;
                const color = barColors[index % barColors.length];
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 truncate text-right">{item.name}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 2)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-28 text-right">
                      {item.value.toFixed(0)} DH · {percentage.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
