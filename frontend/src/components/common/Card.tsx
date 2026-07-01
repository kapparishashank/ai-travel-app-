import React from 'react';
import { Card as PaperCard } from 'react-native-paper';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
  mode?: 'elevated' | 'outlined' | 'contained';
}

export function Card({
  children,
  onPress,
  style,
  elevation = 1,
  mode = 'elevated',
}: CardProps) {
  return (
    <PaperCard
      onPress={onPress}
      style={[styles.card, style]}
      elevation={elevation}
      mode={mode as 'elevated'}
    >
      {children}
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
  },
});
