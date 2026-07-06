import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type AnimateOnHoverProps = {
  children: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AnimateOnHover({ children, disabled = false, style }: AnimateOnHoverProps) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Pressable
      disabled={disabled}
      accessible={false}
      focusable={false}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.wrapper,
        !disabled && hovered && styles.hovered,
        !disabled && pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    transitionDuration: '180ms',
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-out',
  } as ViewStyle,
  hovered: {
    transform: [{ scale: 1.04 }],
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
