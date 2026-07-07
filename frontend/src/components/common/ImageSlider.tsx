import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedView } from './AnimatedView';

export interface SlideItem {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
}

interface ImageSliderProps {
  slides: SlideItem[];
  autoPlayInterval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  height?: number;
  borderRadius?: number;
}

const { width: SCREEN_W } = Dimensions.get('window');

export function ImageSlider({
  slides,
  autoPlayInterval = 5000,
  showArrows = true,
  showDots = true,
  height = 260,
  borderRadius = 20,
}: ImageSliderProps) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = theme.dark || scheme === 'dark';
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = useCallback((nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, slides.length - 1));
    setIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * SCREEN_W, animated: true });
  }, [slides.length]);

  const next = useCallback(() => {
    goTo(index >= slides.length - 1 ? 0 : index + 1);
  }, [goTo, index, slides.length]);

  const prev = useCallback(() => {
    goTo(index <= 0 ? slides.length - 1 : index - 1);
  }, [goTo, index, slides.length]);

  useEffect(() => {
    if (autoPlayInterval > 0 && slides.length > 1) {
      timerRef.current = setInterval(next, autoPlayInterval);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [autoPlayInterval, next, slides.length]);

  const onScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / SCREEN_W);
    if (newIndex !== index) setIndex(newIndex);
  }, [index]);

  if (slides.length === 0) return null;

  return (
    <AnimatedView type="fadeUp" delay={100} duration={700}>
      <View style={[styles.container, { height, borderRadius }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={200}
          decelerationRate="fast"
          snapToInterval={SCREEN_W}
          snapToAlignment="start"
        >
          {slides.map((slide) => (
            <ImageBackground
              key={slide.id}
              source={{ uri: slide.image }}
              style={[styles.slide, { width: SCREEN_W, height }]}
              imageStyle={{ borderRadius }}
              resizeMode="cover"
            >
              <View style={[StyleSheet.absoluteFill, styles.overlay, { borderRadius }]} />
              <View style={styles.slideContent}>
                <Text style={[styles.slideTitle, { color: '#FFFFFF' }]}>{slide.title}</Text>
                {!!slide.subtitle && (
                  <Text style={[styles.slideSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
                    {slide.subtitle}
                  </Text>
                )}
              </View>
            </ImageBackground>
          ))}
        </ScrollView>

        {showArrows && slides.length > 1 && (
          <>
            <Pressable onPress={prev} style={[styles.arrow, styles.arrowLeft]} accessibilityLabel="Previous slide">
              <View style={[styles.arrowCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.30)' }]}>
                <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
              </View>
            </Pressable>
            <Pressable onPress={next} style={[styles.arrow, styles.arrowRight]} accessibilityLabel="Next slide">
              <View style={[styles.arrowCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.30)' }]}>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
              </View>
            </Pressable>
          </>
        )}

        {showDots && slides.length > 1 && (
          <View style={styles.dotsRow}>
            {slides.map((slide, i) => (
              <Pressable key={slide.id} onPress={() => goTo(i)} accessibilityLabel={`Go to slide ${i + 1}`}>
                <View
                  style={[
                    styles.dot,
                    i === index ? styles.dotActive : null,
                    { backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.50)' },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  slide: {
    justifyContent: 'flex-end',
    position: 'relative',
  },
  overlay: {
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  slideContent: {
    padding: 24,
    paddingBottom: 44,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  slideSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    zIndex: 4,
  },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
  },
});
