import React from 'react';
import { View, StyleSheet, Text, ImageBackground } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Button } from './Button';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedView } from './AnimatedView';

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
      <View style={[styles.container, compact && styles.compact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        {inner}
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    marginVertical: 8,
  },
  imageContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    marginVertical: 8,
    minHeight: 220,
    justifyContent: 'center',
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
