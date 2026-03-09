import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "emerald" | "blue" | "amber" | "violet";
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const variantStyles = {
  emerald: "bg-[hsl(var(--chart-emerald)/0.1)] text-[hsl(var(--chart-emerald))]",
  blue: "bg-[hsl(var(--chart-blue)/0.1)] text-[hsl(var(--chart-blue))]",
  amber: "bg-[hsl(var(--chart-amber)/0.1)] text-[hsl(var(--chart-amber))]",
  violet: "bg-[hsl(var(--chart-violet)/0.1)] text-[hsl(var(--chart-violet))]",
};

const borderStyles = {
  emerald: "border-l-[hsl(var(--chart-emerald))]",
  blue: "border-l-[hsl(var(--chart-blue))]",
  amber: "border-l-[hsl(var(--chart-amber))]",
  violet: "border-l-[hsl(var(--chart-violet))]",
};

export function StatCard({ title, value, icon: Icon, variant = "emerald", trend }: StatCardProps) {
  return (
    <Card className={cn(
      "border-l-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
      borderStyles[variant]
    )}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{value}</p>
            {trend && (
              <p className={cn(
                "text-xs mt-1 font-medium",
                trend.isPositive ? "text-[hsl(var(--success))]" : "text-destructive"
              )}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={cn(
            "flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center",
            variantStyles[variant]
          )}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
