import React, { useRef, useState, useCallback, useEffect } from "react";
import { Loader2, ArrowDown } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children, className = "" }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback(
    (e) => {
      if (containerRef.current && containerRef.current.scrollTop <= 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        pulling.current = false;
      }
    },
    [refreshing]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchMove = (e) => {
      if (!pulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        e.preventDefault();
        setPullDistance(Math.min(delta * 0.5, THRESHOLD * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        try {
          await onRefresh?.();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const indicatorHeight = refreshing ? THRESHOLD : pullDistance;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      className={`h-full overflow-y-auto ${className}`}
      style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}
    >
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pulling.current ? "none" : "transform 0.3s ease",
        }}
      >
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: indicatorHeight > 0 ? `${indicatorHeight}px` : "0px" }}
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <ArrowDown
              className="w-5 h-5 text-slate-400 transition-transform"
              style={{ transform: `rotate(${180 * progress}deg)`, opacity: progress }}
            />
          )}
        </div>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}