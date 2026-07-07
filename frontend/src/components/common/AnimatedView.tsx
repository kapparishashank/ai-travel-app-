import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

type AnimationType = 'fadeUp' | 'fadeDown' | 'slideLeft' | 'slideRight' | 'scale' | 'fade';

interface AnimatedViewProps {
  children: React.ReactNode;
  type?: AnimationType;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

const getInitialValues = (type: AnimationType) => {
  switch (type) {
    case 'fadeUp':
      return { opacity: 0, translateY: 32 };
    case 'fadeDown':
      return { opacity: 0, translateY: -32 };
    case 'slideLeft':
      return { opacity: 0, translateX: -40 };
    case 'slideRight':
      return { opacity: 0, translateX: 40 };
    case 'scale':
      return { opacity: 0, scale: 0.92 };
    case 'fade':
    default:
      return { opacity: 0, translateY: 0 };
  }
};

export function AnimatedView({
  children,
  type = 'fadeUp',
  delay = 0,
  duration = 600,
  style,
  active = true,
}: AnimatedViewProps) {
  const initial = getInitialValues(type);
  const opacity = useRef(new Animated.Value(active ? initial.opacity : 1)).current;
  const translateY = useRef(new Animated.Value(active ? initial.translateY ?? 0 : 0)).current;
  const translateX = useRef(new Animated.Value(active ? initial.translateX ?? 0 : 0)).current;
  const scale = useRef(new Animated.Value(active ? initial.scale ?? 1 : 1)).current;

  useEffect(() => {
    if (!active) return;

    const animations: Animated.CompositeAnimation[] = [];

    animations.push(
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      })
    );

    if (type === 'fadeUp' || type === 'fadeDown') {
      animations.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (type === 'slideLeft' || type === 'slideRight') {
      animations.push(
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    if (type === 'scale') {
      animations.push(
        Animated.timing(scale, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [active, delay, duration, opacity, scale, translateX, translateY, type]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
