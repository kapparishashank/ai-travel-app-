import React from 'react';
import { View, StyleSheet, StyleProp, ImageBackground, Platform } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MountainPattern } from './MountainPattern';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  imageUrl?: string;
  overlayOpacity?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function GlassCard({
  children,
  style,
  imageUrl,
  overlayOpacity = 0.28,
  onPress,
  accessibilityLabel,
}: GlassCardProps) {
  const theme = useTheme();
  const isDark = theme.dark;

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: imageUrl ? 'transparent' : isDark ? 'rgba(30,41,59,0.64)' : 'rgba(255,255,255,0.45)',
          borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.55)',
        },
        !imageUrl && liquidGlassWebStyle,
        style,
      ]}
    >
      {!imageUrl && <MountainPattern opacity={0.12} position="bottomRight" size="sm" />}
      {!imageUrl && <View pointerEvents="none" style={styles.liquidShine} />}
      {!imageUrl && <View pointerEvents="none" style={styles.liquidReflection} />}
      {imageUrl && (
        <ImageBackground
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.image}
          resizeMode="cover"
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: `rgba(15,23,42,${overlayOpacity})` },
            ]}
          />
        </ImageBackground>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <View
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onTouchEnd={onPress}
        style={{ borderRadius: 16 }}
      >
        {content}
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#3B2F22',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
  image: {
    borderRadius: 28,
  },
  content: {
    padding: 20,
    position: 'relative',
    zIndex: 2,
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
});

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
