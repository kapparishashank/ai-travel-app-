import React from 'react';
import { Card as PaperCard } from 'react-native-paper';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  mode?: 'elevated' | 'outlined' | 'contained';
  accessibilityLabel?: string;
}

export function Card({
  children,
  onPress,
  style,
  elevation = 1,
  mode = 'elevated',
  accessibilityLabel,
}: CardProps) {
  if (mode === 'outlined') {
    return (
      <PaperCard
        onPress={onPress}
        style={[styles.card, style]}
        mode="outlined"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        {children}
      </PaperCard>
    );
  }

  if (mode === 'contained') {
    return (
      <PaperCard
        onPress={onPress}
        style={[styles.card, style]}
        mode="contained"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        {children}
      </PaperCard>
    );
  }

  return (
    <PaperCard
      onPress={onPress}
      style={[styles.card, style]}
      elevation={elevation}
      mode="elevated"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {children}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
