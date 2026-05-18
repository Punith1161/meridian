import { useState, useEffect } from 'react';

export function useTimer(isRunning, initialSeconds = 0) {
  const [displaySeconds, setDisplaySeconds] = useState(initialSeconds);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setDisplaySeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    setDisplaySeconds(initialSeconds);
  }, [initialSeconds]);

  return displaySeconds;
}
