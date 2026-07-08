import React from 'react';
import { Card as PaperCard } from 'react-native-paper';
import { Platform, StyleSheet, StyleProp, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { AnimateOnHover } from './AnimateOnHover';
import { MountainPattern } from './MountainPattern';

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
  const content = (
    <View style={styles.cardInner}>
      <MountainPattern opacity={0.12} position="bottomRight" size="sm" />
      <View pointerEvents="none" style={styles.liquidShine} />
      <View pointerEvents="none" style={styles.liquidReflection} />
      <View style={styles.contentLayer}>{children}</View>
    </View>
  );

  if (mode === 'outlined') {
    const card = (
      <PaperCard
        onPress={onPress}
        style={[styles.card, liquidGlassWebStyle, style]}
        mode="outlined"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        {content}
      </PaperCard>
    );
    return onPress ? <AnimateOnHover>{card}</AnimateOnHover> : card;
  }

  if (mode === 'contained') {
    const card = (
      <PaperCard
        onPress={onPress}
        style={[styles.card, liquidGlassWebStyle, style]}
        mode="contained"
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={onPress ? 'button' : undefined}
      >
        {content}
      </PaperCard>
    );
    return onPress ? <AnimateOnHover>{card}</AnimateOnHover> : card;
  }

  const card = (
    <PaperCard
      onPress={onPress}
      style={[styles.card, liquidGlassWebStyle, style]}
      elevation={elevation}
      mode="elevated"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {content}
    </PaperCard>
  );
  return onPress ? <AnimateOnHover>{card}</AnimateOnHover> : card;
}

const liquidGlassWebStyle = Platform.select({
  web: {
    backdropFilter: 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    transitionDuration: '350ms',
    transitionProperty: 'transform, box-shadow',
    transitionTimingFunction: 'ease',
  } as ViewStyle,
  default: {},
});

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#3B2F22',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
  liquidShine: {
    position: 'absolute',
    top: -92,
    left: -92,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.72)',
    opacity: 0.4,
  },
  liquidReflection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -120,
    width: 110,
    backgroundColor: 'rgba(255,255,255,0.28)',
    opacity: 0.5,
    transform: [{ skewX: '-18deg' }],
  },
  contentLayer: {
    position: 'relative',
    zIndex: 2,
  },
  cardInner: {
    position: 'relative',
    overflow: 'hidden',
  },
});
