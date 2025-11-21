import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "available" | "limited" | "full" | "unavailable" | "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  children?: React.ReactNode;
  className?: string;
}

const statusStyles = {
  available: "bg-success/20 text-success border-success/30",
  limited: "bg-warning/20 text-warning border-warning/30",
  full: "bg-destructive/20 text-destructive border-destructive/30",
  unavailable: "bg-muted/20 text-muted-foreground border-border",
  pending: "bg-warning/20 text-warning border-warning/30",
  confirmed: "bg-primary/20 text-primary border-primary/30",
  in_progress: "bg-info/20 text-info border-info/30",
  completed: "bg-success/20 text-success border-success/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

const statusLabels = {
  available: "Available",
  limited: "Limited",
  full: "Full",
  unavailable: "Unavailable",
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const StatusBadge = ({ status, children, className }: StatusBadgeProps) => {
  const displayText = children || statusLabels[status];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border chrome-label text-xs",
        statusStyles[status],
        className
      )}
    >
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      {displayText}
    </div>
  );
};
