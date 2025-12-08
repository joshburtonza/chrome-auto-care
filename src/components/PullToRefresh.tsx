import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

export const PullToRefresh = ({ 
  onRefresh, 
  children, 
  threshold = 80 
}: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only enable when scrolled to top
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === 0 || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    
    // Only pull down, with resistance
    if (diff > 0) {
      const resistance = 0.4;
      const distance = Math.min(diff * resistance, threshold * 1.5);
      setPullDistance(distance);
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(15);
      }
      
      // Animate to loading position
      controls.start({ y: 50 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        controls.start({ y: 0 });
      }
    }
    
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, threshold, isRefreshing, onRefresh, controls]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        style={{ 
          top: isRefreshing ? 16 : Math.max(pullDistance - 40, -40),
          opacity: showIndicator ? 1 : 0,
        }}
        animate={controls}
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-card border border-border/50 shadow-lg flex items-center justify-center"
          animate={{ 
            rotate: isRefreshing ? 360 : progress * 180,
          }}
          transition={{ 
            rotate: isRefreshing 
              ? { duration: 0.8, repeat: Infinity, ease: "linear" }
              : { duration: 0 }
          }}
        >
          <RefreshCw 
            className={`w-5 h-5 transition-colors ${
              progress >= 1 || isRefreshing ? 'text-primary' : 'text-muted-foreground'
            }`}
            strokeWidth={2}
          />
        </motion.div>
      </motion.div>

      {/* Content with pull effect */}
      <motion.div
        style={{ 
          transform: `translateY(${isRefreshing ? 50 : pullDistance}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
