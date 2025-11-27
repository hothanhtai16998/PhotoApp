import { useEffect, useState, useRef } from 'react';
import './countdown-timer.css';

interface CountdownTimerProps {
  progress: number; // 0-100
  totalDuration: number; // in milliseconds (6200)
}

export function CountdownTimer({ progress, totalDuration }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(6);
  const [, setPrevSeconds] = useState(6);
  const [isFlipping, setIsFlipping] = useState(false);
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProgressRef = useRef(0);

  useEffect(() => {
    // Calculate remaining seconds from progress
    const remainingProgress = 100 - progress;
    const remainingTime = (remainingProgress / 100) * (totalDuration / 1000);
    const newSeconds = Math.max(0, Math.min(6, Math.ceil(remainingTime)));
    
    // Only trigger flip if seconds actually changed
    if (newSeconds !== seconds) {
      setPrevSeconds(seconds);
      setSeconds(newSeconds);
      setIsFlipping(true);
      
      // Reset flip animation after it completes
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
      }
      flipTimeoutRef.current = setTimeout(() => {
        setIsFlipping(false);
      }, 600); // Match CSS animation duration
    }
    
    prevProgressRef.current = progress;
  }, [progress, totalDuration]);

  // For countdown 0-6, we only need to show a single digit
  const displayDigit = seconds;
  const nextDigit = displayDigit > 0 ? displayDigit - 1 : 6; // Next number for countdown (wraps from 0 to 6)

  return (
    <div className="countdown-timer-container">
      {/* Single digit display */}
      <div className="countdown-nums">
        <div className="countdown-num-divider"></div>
        <div className={`countdown-num-top ${isFlipping ? 'flipping' : ''}`}>
          {displayDigit}
        </div>
        <div className={`countdown-num-bottom ${isFlipping ? 'flipping' : ''}`}>
          {nextDigit}
        </div>
      </div>
    </div>
  );
}

