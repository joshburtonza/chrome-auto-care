import { cn } from "@/lib/utils";

interface ChromeSurfaceProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  sheen?: boolean;
}

export const ChromeSurface = ({ children, className, glow = false, sheen = false }: ChromeSurfaceProps) => {
  return (
    <div
      className={cn(
        "chrome-surface rounded-lg border border-border/50",
        glow && "chrome-glow",
        sheen && "chrome-sheen",
        className
      )}
    >
      {children}
    </div>
  );
};
