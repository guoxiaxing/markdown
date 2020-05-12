import { useRef, useState, useCallback } from "react";

const useCounter = (initialCount, time) => {
  const [count, setCount] = useState(initialCount);
  const intervalRef = useRef(null);
  const start = useCallback(() => {
    if (intervalRef.current !== null) {
      return;
    }
    intervalRef.current = setInterval(() => {
      setCount(c => c + 1);
    }, time);
  }, []);
  const stop = useCallback(() => {
    if (intervalRef.current === null) {
      return;
    }
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);
  const reset = useCallback(() => {
    setCount(0);
  }, []);
  return { count, start, stop, reset };
};
export default useCounter;
