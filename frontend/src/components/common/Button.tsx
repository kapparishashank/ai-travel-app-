import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import type { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import { StyleProp, ViewStyle, StyleSheet } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  mode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconSource;
  style?: StyleProp<ViewStyle>;
  color?: string;
  accessibilityLabel?: string;
}

export function Button({
  children,
  onPress,
  mode = 'contained',
  loading = false,
  disabled = false,
  icon,
  style,
  color,
  accessibilityLabel,
}: ButtonProps) {
  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      style={[styles.button, style]}
      buttonColor={color && mode === 'contained' ? color : undefined}
      textColor={color && (mode === 'text' || mode === 'outlined') ? color : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {children}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    marginVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
});
