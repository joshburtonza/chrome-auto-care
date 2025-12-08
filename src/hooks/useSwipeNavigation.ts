import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Pages in bottom nav order
const NAV_PAGES = [
  '/dashboard',
  '/services',
  '/bookings',
  '/garage',
  '/profile',
];

interface SwipeConfig {
  threshold?: number; // Minimum distance to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
}

export const useSwipeNavigation = (config: SwipeConfig = {}) => {
  const { threshold = 80, velocityThreshold = 0.3 } = config;
  const navigate = useNavigate();
  const location = useLocation();
  
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwiping = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isSwiping.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      
      // Only track horizontal swipes (ignore vertical scrolling)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
        isSwiping.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current || !isSwiping.current) {
        touchStart.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const deltaTime = Date.now() - touchStart.current.time;
      const velocity = Math.abs(deltaX) / deltaTime;

      // Reset
      touchStart.current = null;
      isSwiping.current = false;

      // Ignore vertical swipes
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      // Check if swipe meets threshold or velocity
      const meetsThreshold = Math.abs(deltaX) > threshold;
      const meetsVelocity = velocity > velocityThreshold && Math.abs(deltaX) > 40;

      if (!meetsThreshold && !meetsVelocity) return;

      // Find current page index
      const currentIndex = NAV_PAGES.indexOf(location.pathname);
      if (currentIndex === -1) return;

      // Trigger haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      // Navigate based on swipe direction
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous page
        navigate(NAV_PAGES[currentIndex - 1]);
      } else if (deltaX < 0 && currentIndex < NAV_PAGES.length - 1) {
        // Swipe left - go to next page
        navigate(NAV_PAGES[currentIndex + 1]);
      }
    };

    // Only enable on mobile (check for md breakpoint)
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate, threshold, velocityThreshold]);
};
