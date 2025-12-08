import { cn } from "@/lib/utils";

interface ChromeSurfaceProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  sheen?: boolean;
  onClick?: () => void;
}

export const ChromeSurface = ({ children, className, glow = false, sheen = false, onClick }: ChromeSurfaceProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card border border-border/30",
        "shadow-[0_1px_2px_hsl(var(--foreground)/0.02),0_4px_12px_hsl(var(--foreground)/0.03)]",
        "transition-all duration-200",
        glow && "shadow-[0_2px_8px_hsl(var(--foreground)/0.04),0_8px_24px_hsl(var(--foreground)/0.04)]",
        sheen && "hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.06)] hover:border-border/50",
        onClick && "cursor-pointer hover:scale-[1.01]",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};