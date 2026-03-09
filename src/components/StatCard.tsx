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
  emerald: {
    bg: "bg-[hsl(160,84%,39%)]",
    iconBg: "bg-white/20",
    text: "text-white",
    subtleText: "text-white/70",
  },
  blue: {
    bg: "bg-[hsl(217,91%,60%)]",
    iconBg: "bg-white/20",
    text: "text-white",
    subtleText: "text-white/70",
  },
  amber: {
    bg: "bg-[hsl(38,92%,50%)]",
    iconBg: "bg-white/20",
    text: "text-white",
    subtleText: "text-white/70",
  },
  violet: {
    bg: "bg-[hsl(263,70%,50%)]",
    iconBg: "bg-white/20",
    text: "text-white",
    subtleText: "text-white/70",
  },
};

export function StatCard({ title, value, icon: Icon, variant = "emerald", trend }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn(
      "border-0 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden",
      styles.bg
    )}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-medium uppercase tracking-wider truncate", styles.subtleText)}>{title}</p>
            <p className={cn("text-2xl sm:text-3xl font-bold mt-1 truncate", styles.text)}>{value}</p>
            {trend && (
              <p className={cn("text-xs mt-1.5 font-medium", styles.subtleText)}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
            styles.iconBg
          )}>
            <Icon className={cn("h-6 w-6", styles.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
