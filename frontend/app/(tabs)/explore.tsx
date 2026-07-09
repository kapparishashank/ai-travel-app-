import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { AnimatedView } from '../../src/components/common/AnimatedView';
import { EmptyState } from '../../src/components/common/EmptyState';
import { GlassCard } from '../../src/components/common/GlassCard';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { MOUNTAIN_IMAGES, mountainDestinations } from '../../src/constants/images';
import { DestinationCard, SectionHeader, SkeletonBlock } from '../../src/features/home/HomeCards';
import { useHomeData } from '../../src/features/home/useHomeData';

export default function ExploreScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { destinations, loading, refreshing, refresh } = useHomeData();
  const isWide = width >= 900;

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={[styles.container, isWide && styles.wideContainer]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>Explore</Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Discover destinations using the same recommendations from your TravelAI home data.
          </Text>
        </View>

        {loading ? (
          <>
            <SkeletonBlock height={220} />
            <SkeletonBlock height={220} />
          </>
        ) : (
          <>
            <AnimatedView type="fadeUp" delay={100}>
              <SectionHeader title="Mountain Destinations" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {mountainDestinations.map((dest) => (
                  <GlassCard
                    key={dest.id}
                    imageUrl={dest.image}
                    overlayOpacity={0.12}
                    style={[styles.mountainCard, { width: isWide ? 280 : 240 }]}
                    onPress={() => router.push(`/(tabs)/destination/${dest.id}`)}
                    accessibilityLabel={`Explore ${dest.title}`}
                  >
                    <Text style={styles.mountainCardTitle}>{dest.title}</Text>
                    <Text style={styles.mountainCardDesc}>{dest.description}</Text>
                    <View style={styles.mountainCardMeta}>
                      <MaterialCommunityIcons name="currency-inr" size={14} color="#FFFFFF" />
                      <Text style={styles.mountainCardMetaText}>{dest.budget}</Text>
                    </View>
                    <View style={styles.mountainCardMeta}>
                      <MaterialCommunityIcons name="calendar-range" size={14} color="rgba(255,255,255,0.80)" />
                      <Text style={[styles.mountainCardMetaText, { color: 'rgba(255,255,255,0.80)' }]}>
                        {dest.bestTime}
                      </Text>
                    </View>
                  </GlassCard>
                ))}
              </ScrollView>
            </AnimatedView>

            <AnimatedView type="fadeUp" delay={150}>
              <SectionHeader title="Recommended destinations" />
              {destinations.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {destinations.map((destination) => (
                    <DestinationCard
                      key={destination.id}
                      destination={destination}
                      onPress={() => router.push(`/(tabs)/destination/${destination.id}`)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <EmptyState
                  title="No recommendations yet"
                  description="Search or plan a trip to get destination suggestions."
                  icon="compass-outline"
                  actionLabel="Plan a Trip"
                  onAction={() => router.push('/(tabs)/plan-trip')}
                  imageUrl={MOUNTAIN_IMAGES.greenHills}
                />
              )}
            </AnimatedView>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  wideContainer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1180,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 620,
  },
  horizontalList: {
    gap: 12,
    paddingRight: 16,
  },
  mountainCard: {
    padding: 16,
    width: 240,
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  mountainCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.40)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mountainCardDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 17,
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mountainCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  mountainCardMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
