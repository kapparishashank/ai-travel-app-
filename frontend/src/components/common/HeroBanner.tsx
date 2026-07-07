import React from 'react';
import { ImageBackground, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from 'react-native-paper';

interface HeroBannerProps {
  imageUrl: string;
  children: React.ReactNode;
  overlayOpacity?: number;
  height?: number;
  minHeight?: number;
}

export function HeroBanner({
  imageUrl,
  children,
  overlayOpacity = 0.5,
  height,
  minHeight = 320,
}: HeroBannerProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isDark = theme.dark;

  return (
    <ImageBackground
      source={{ uri: imageUrl }}
      style={[{ width, height, minHeight }, styles.container]}
      imageStyle={styles.image}
      resizeMode="cover"
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? `rgba(15,23,42,${overlayOpacity})`
              : `rgba(30,41,59,${overlayOpacity})`,
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    position: 'relative',
    zIndex: 2,
  },
});
