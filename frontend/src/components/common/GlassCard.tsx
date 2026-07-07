import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ImageBackground } from 'react-native';
import { useTheme } from 'react-native-paper';

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
  overlayOpacity = 0.55,
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
          backgroundColor: imageUrl ? 'transparent' : isDark ? 'rgba(30,41,59,0.72)' : 'rgba(255,255,255,0.82)',
          borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.60)',
        },
        style,
      ]}
    >
      {imageUrl && (
        <ImageBackground
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.image}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? `rgba(15,23,42,${overlayOpacity})` : `rgba(248,250,252,${overlayOpacity})` },
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
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  image: {
    borderRadius: 16,
  },
  content: {
    padding: 20,
    position: 'relative',
    zIndex: 2,
  },
});
