import React from 'react';
import { View, StyleSheet, Text, ImageBackground, Platform } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Button } from './Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedView } from './AnimatedView';
import { MountainPattern } from './MountainPattern';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  imageUrl?: string;
}
type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function EmptyState({
  title,
  description,
  icon = 'wallet-travel',
  actionLabel,
  onAction,
  compact = false,
  imageUrl,
}: EmptyStateProps) {
  const theme = useTheme();

  const inner = (
    <>
      <View style={[styles.iconShell, { backgroundColor: imageUrl ? 'rgba(255,255,255,0.20)' : theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons
          name={icon as MaterialIconName}
          size={compact ? 28 : 36}
          color={imageUrl ? '#FFFFFF' : theme.colors.primary}
        />
      </View>
      <Text style={[styles.title, { color: imageUrl ? '#FFFFFF' : theme.colors.onBackground }]}>{title}</Text>
      <Text style={[styles.description, { color: imageUrl ? 'rgba(255,255,255,0.85)' : theme.colors.onSurfaceVariant }]}>{description}</Text>
      {!!actionLabel && !!onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </>
  );

  if (imageUrl) {
    return (
      <AnimatedView type="fadeUp" delay={150} duration={600}>
        <ImageBackground source={{ uri: imageUrl }} style={[styles.imageContainer, compact && styles.compact]} imageStyle={{ borderRadius: 16 }}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.55)', borderRadius: 16 }]} />
          <View style={styles.imageInner}>{inner}</View>
        </ImageBackground>
      </AnimatedView>
    );
  }

  return (
    <AnimatedView type="fadeUp" delay={150} duration={600}>
      <View style={[styles.container, liquidGlassWebStyle, compact && styles.compact, { borderColor: theme.colors.outlineVariant }]}>
        <MountainPattern opacity={0.16} position="bottomRight" size="md" />
        <View pointerEvents="none" style={styles.liquidShine} />
        <View style={styles.contentLayer}>
        {inner}
        </View>
      </View>
    </AnimatedView>
  );
}

const liquidGlassWebStyle = Platform.select({
  web: {
    backdropFilter: 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  } as ViewStyle,
  default: {},
});

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 28,
    marginVertical: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#3B2F22',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 5,
  },
  imageContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    marginVertical: 8,
    minHeight: 220,
    justifyContent: 'center',
  },
  contentLayer: {
    position: 'relative',
    zIndex: 2,
    alignItems: 'center',
  },
  liquidShine: {
    position: 'absolute',
    top: -92,
    left: -92,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.72)',
    opacity: 0.38,
  },
  imageInner: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  compact: {
    padding: 18,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 420,
  },
  button: {
    minWidth: 160,
  },
});
