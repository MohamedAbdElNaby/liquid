import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether the system asks for less motion (iOS Reduce Motion, Android "Remove animations"). */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) {
        setReduced(value);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
