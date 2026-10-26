import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Spring-driven press feedback that runs on the native driver.
 * `pressed` goes from 0 to 1 while the finger is down.
 */
export function usePressAnimation() {
  const pressed = useRef(new Animated.Value(0)).current;

  const animate = (toValue: number) => {
    Animated.spring(pressed, {
      toValue,
      useNativeDriver: true,
      damping: 14,
      stiffness: 260,
      mass: 0.8,
    }).start();
  };

  return {
    pressed,
    onPressIn: () => animate(1),
    onPressOut: () => animate(0),
  };
}

/** An animated value that springs to `toValue` whenever it changes. */
export function useSpringValue(toValue: number) {
  const value = useRef(new Animated.Value(toValue)).current;

  useEffect(() => {
    const animation = Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      damping: 20,
      stiffness: 220,
      mass: 1,
    });
    animation.start();
    return () => animation.stop();
  }, [value, toValue]);

  return value;
}
