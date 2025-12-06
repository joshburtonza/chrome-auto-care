import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "available" | "limited" | "full" | "unavailable" | "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  children?: React.ReactNode;
  className?: string;
}

const statusStyles = {
  available: "bg-[hsl(160,35%,40%)]/15 text-[hsl(160,45%,60%)] border-[hsl(160,35%,40%)]/25",
  limited: "bg-[hsl(35,40%,45%)]/15 text-[hsl(35,50%,65%)] border-[hsl(35,40%,45%)]/25",
  full: "bg-[hsl(0,40%,45%)]/15 text-[hsl(0,50%,65%)] border-[hsl(0,40%,45%)]/25",
  unavailable: "bg-white/5 text-[hsl(215,12%,55%)] border-white/10",
  pending: "bg-[hsl(35,40%,45%)]/15 text-[hsl(35,50%,65%)] border-[hsl(35,40%,45%)]/25",
  confirmed: "bg-[hsl(200,40%,45%)]/15 text-[hsl(200,50%,65%)] border-[hsl(200,40%,45%)]/25",
  in_progress: "bg-[hsl(200,40%,45%)]/15 text-[hsl(200,50%,65%)] border-[hsl(200,40%,45%)]/25",
  completed: "bg-[hsl(160,35%,40%)]/15 text-[hsl(160,45%,60%)] border-[hsl(160,35%,40%)]/25",
  cancelled: "bg-[hsl(0,40%,45%)]/15 text-[hsl(0,50%,65%)] border-[hsl(0,40%,45%)]/25",
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
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium",
        statusStyles[status],
        className
      )}
    >
      {displayText}
    </span>
  );
};