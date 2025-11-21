import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ChromeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  children: React.ReactNode;
}

export const ChromeButton = forwardRef<HTMLButtonElement, ChromeButtonProps>(
  ({ children, className, variant = "default", size = "default", asChild, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        asChild={asChild}
        className={cn(
          "chrome-label uppercase tracking-[2px] transition-all duration-300",
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 chrome-glow",
          variant === "outline" && "border-primary/30 text-primary hover:bg-primary/10",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

ChromeButton.displayName = "ChromeButton";
