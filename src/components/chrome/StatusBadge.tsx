import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "available" | "limited" | "full" | "unavailable";
  children: React.ReactNode;
  className?: string;
}

const statusStyles = {
  available: "bg-success/20 text-success border-success/30",
  limited: "bg-warning/20 text-warning border-warning/30",
  full: "bg-destructive/20 text-destructive border-destructive/30",
  unavailable: "bg-muted/20 text-muted-foreground border-border",
};

export const StatusBadge = ({ status, children, className }: StatusBadgeProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border chrome-label",
        statusStyles[status],
        className
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full", status === "available" && "bg-success", status === "limited" && "bg-warning", status === "full" && "bg-destructive", status === "unavailable" && "bg-muted-foreground")} />
      {children}
    </div>
  );
};
