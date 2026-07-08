import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Platform,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../src/components/common/Button';
import { AnimateOnHover } from '../../src/components/common/AnimateOnHover';
import { EmptyState } from '../../src/components/common/EmptyState';
import { GlowingSearchBar } from '../../src/components/common/GlowingSearchBar';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
import { AnimatedView } from '../../src/components/common/AnimatedView';
import { ImageSlider } from '../../src/components/common/ImageSlider';
import { GlassCard } from '../../src/components/common/GlassCard';
import { MountainPattern } from '../../src/components/common/MountainPattern';
import { MOUNTAIN_IMAGES, mountainDestinations } from '../../src/constants/images';
import { useAuthStore } from '../../src/store/authStore';
import {
  AlertCard,
  DestinationCard,
  RecentSearchCard,
  SectionHeader,
  ShortcutCard,
  SkeletonBlock,
  TripCard,
} from '../../src/features/home/HomeCards';
import { useHomeData } from '../../src/features/home/useHomeData';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const {
    alerts,
    destinations,
    searches,
    upcomingTrip,
    activeTrip,
    isTripNear,
    loading,
    refreshing,
    refresh,
  } = useHomeData();

  const isWide = width >= 900;
  const firstName = user?.full_name?.split(' ')[0] ?? 'Traveler';
  const displayedSearches = searches;

  const submitSearch = () => {
    const query = search.trim();
    if (query) {
      router.push({ pathname: '/(tabs)/explore', params: { q: query } });
    } else {
      router.push('/(tabs)/explore');
    }
  };

  const sliderSlides = [
    { id: '1', image: MOUNTAIN_IMAGES.hero, title: 'Explore the Himalayas', subtitle: 'Breathtaking views await' },
    { id: '2', image: MOUNTAIN_IMAGES.ladakh, title: 'Discover Ladakh', subtitle: 'High-altitude adventure' },
    { id: '3', image: MOUNTAIN_IMAGES.munnar, title: 'Munnar Tea Gardens', subtitle: 'Peaceful hill station escape' },
    { id: '4', image: MOUNTAIN_IMAGES.sunrise, title: 'Sunrise Over Peaks', subtitle: 'Start your journey at dawn' },
  ];

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={[styles.container, isWide && styles.wideContainer]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {/* Hero Banner */}
        <AnimatedView type="fadeUp" duration={800}>
          <View style={[styles.heroBg, liquidGlassWebStyle, { borderColor: theme.colors.outlineVariant }]}>
            <MountainPattern animated opacity={0.34} position="bottomRight" size="lg" />
            <MountainPattern opacity={0.18} position="bottomLeft" size="md" />
            <View pointerEvents="none" style={styles.heroShine} />
            <View style={styles.heroContent}>
              <Text style={[styles.heroGreeting, { color: theme.colors.onSurfaceVariant }]}>Hi {firstName},</Text>
              <Text style={[styles.heroTitle, { color: theme.colors.onSurface }]}>Plan Smarter Trips with AI</Text>
              <Text style={[styles.heroSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Discover destinations, compare travel options, manage expenses, stay safe, and pack smarter with your AI travel companion.
              </Text>
              <View style={[styles.heroActions, isWide && styles.heroActionsRow]}>
                <Button icon="map-plus" onPress={() => router.push('/(tabs)/plan-trip')} style={styles.heroBtn}>
                  Start Planning
                </Button>
                <Button mode="outlined" icon="compass-outline" onPress={() => router.push('/(tabs)/explore')} style={styles.heroBtnOutlined}>
                  Explore Destinations
                </Button>
              </View>
            </View>
          </View>
        </AnimatedView>

        <GlowingSearchBar
          placeholder="Search destinations, trips, or routes"
          value={search}
          onChange={setSearch}
          onSearch={submitSearch}
          style={styles.search}
        />

        {/* Image Slider */}
        <ImageSlider slides={sliderSlides} height={isWide ? 340 : 260} />

        {loading ? (
          <>
            <SkeletonBlock height={112} />
            <SkeletonBlock height={92} />
            <SkeletonBlock height={180} />
          </>
        ) : (
          <View style={[styles.contentGrid, isWide && styles.contentGridWide]}>
            <View style={styles.mainColumn}>
              <AnimatedView type="fadeUp" delay={100}>
                <View style={[styles.shortcutGrid, isWide && styles.shortcutGridWide]}>
                  <ShortcutCard
                    title="Smart Journey"
                    description="Compare route options with time, comfort, and hidden costs."
                    icon="map-search-outline"
                    onPress={() => router.push('/(tabs)/smart-journey')}
                  />
                  <ShortcutCard
                    title="Budget Discovery"
                    description="Find destinations that match your budget and travel pace."
                    icon="wallet-outline"
                    onPress={() => router.push('/(tabs)/budget-discovery')}
                  />
                </View>
              </AnimatedView>

              <AnimatedView type="fadeUp" delay={150}>
                <SectionHeader title="Upcoming trip" />
                {upcomingTrip ? (
                  <TripCard trip={upcomingTrip} onPress={() => router.push(`/(tabs)/trip/${upcomingTrip.id}`)} />
                ) : (
                  <EmptyState
                    title="No trips yet"
                    description="Create your first trip to unlock itinerary, packing, safety, and expense tools."
                    icon="airplane-plus"
                    actionLabel="Plan a Trip"
                    onAction={() => router.push('/(tabs)/plan-trip')}
                    imageUrl={MOUNTAIN_IMAGES.lake}
                  />
                )}
              </AnimatedView>

              {isTripNear && upcomingTrip && (
                <AnimatedView type="slideLeft" delay={100}>
                  <ShortcutCard
                    title="Packing reminder"
                    description={`${upcomingTrip.destination} is coming up soon. Review documents, weather gear, and shared items.`}
                    icon="bag-suitcase-outline"
                    onPress={() => router.push('/(tabs)/packing')}
                  />
                </AnimatedView>
              )}

              {(activeTrip || upcomingTrip?.status === 'active') && (
                <AnimatedView type="slideRight" delay={100}>
                  <GlassCard
                    imageUrl={MOUNTAIN_IMAGES.adventure}
                    onPress={() => router.push('/(tabs)/safety-mode')}
                    style={styles.safetyModeCard}
                  >
                    <View style={styles.safetyCardHeader}>
                      <MaterialCommunityIcons name="shield-check-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.safetyCardTag}>LIVE TRAVEL PROTECTION</Text>
                    </View>
                    <Text style={styles.safetyCardTitle}>Safety Mode</Text>
                    <Text style={styles.safetyCardDesc}>
                      Start check-ins and keep trusted contacts ready while traveling.
                    </Text>
                  </GlassCard>
                </AnimatedView>
              )}

              <AnimatedView type="fadeUp" delay={150}>
                <SectionHeader
                  title="Active price alerts"
                  action={
                    <AnimateOnHover>
                      <Text
                        accessibilityRole="button"
                        onPress={() => router.push('/(tabs)/price-alerts')}
                        style={[styles.textAction, { color: theme.colors.primary }]}
                      >
                        View all
                      </Text>
                    </AnimateOnHover>
                  }
                />
                {alerts.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                    {alerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onPress={() => router.push('/(tabs)/price-alerts')}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <EmptyState
                    title="No active alerts"
                    description="Create a route alert and TravelAI will watch price movement for you."
                    icon="bell-plus-outline"
                    actionLabel="Create alert"
                    onAction={() => router.push('/(tabs)/price-alerts')}
                    imageUrl={MOUNTAIN_IMAGES.snow}
                  />
                )}
              </AnimatedView>

              {/* Mountain Destinations */}
              <AnimatedView type="fadeUp" delay={200}>
                <SectionHeader title="Mountain Destinations" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {mountainDestinations.map((dest, i) => (
                    <GlassCard
                      key={dest.id}
                      imageUrl={dest.image}
                      overlayOpacity={0.12}
                      style={[styles.mountainCard, { width: isWide ? 280 : 240 }]}
                      onPress={() => router.push(`/(tabs)/explore`)}
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
                        <Text style={[styles.mountainCardMetaText, { color: 'rgba(255,255,255,0.80)' }]}>{dest.bestTime}</Text>
                      </View>
                    </GlassCard>
                  ))}
                </ScrollView>
              </AnimatedView>

              <AnimatedView type="fadeUp" delay={150}>
                <SectionHeader title="Recommended destinations" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {destinations.map((destination) => (
                    <DestinationCard
                      key={destination.id}
                      destination={destination}
                      onPress={() => router.push(`/(tabs)/destination/${destination.id}`)}
                    />
                  ))}
                </ScrollView>
              </AnimatedView>
            </View>

            <View style={[styles.sideColumn, isWide && styles.sideColumnWide]}>
              <AnimatedView type="slideRight" delay={200}>
                <View style={[styles.tipPanel, liquidGlassWebStyle, { borderColor: theme.colors.outlineVariant }]}>
                  <MountainPattern opacity={0.13} position="bottomRight" size="sm" />
                  <View pointerEvents="none" style={styles.tipShine} />
                  <View style={styles.tipContent}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={theme.colors.secondary} />
                  <Text style={[styles.tipTitle, { color: theme.colors.onSurface }]}>First-time traveler tip</Text>
                  <Text style={[styles.tipBody, { color: theme.colors.onSurfaceVariant }]}>
                    Start with dates and budget. You can skip preferences and refine the plan later.
                  </Text>
                  </View>
                </View>
              </AnimatedView>

              <AnimatedView type="slideRight" delay={250}>
                <SectionHeader title="Recent searches" />
                {displayedSearches.length ? (
                  displayedSearches.map((item) => (
                    <RecentSearchCard
                      key={item.id}
                      search={item}
                      onPress={() => router.push(`/(tabs)/search/${item.id}`)}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No recent searches"
                    description="Search a destination or route to resume it later."
                    icon="history"
                    actionLabel="Explore"
                    onAction={() => router.push('/(tabs)/explore')}
                    imageUrl={MOUNTAIN_IMAGES.greenHills}
                  />
                )}
              </AnimatedView>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
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
    padding: 16,
    paddingBottom: 32,
  },
  wideContainer: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1180,
    paddingHorizontal: 24,
  },
  heroBg: {
    height: 380,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.46)',
    borderWidth: 1,
    shadowColor: '#3B2F22',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.12,
    shadowRadius: 34,
    elevation: 8,
  },
  heroContent: {
    padding: 24,
    position: 'relative',
    zIndex: 2,
  },
  heroGreeting: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 560,
  },
  heroActions: {
    marginTop: 18,
    gap: 10,
  },
  heroActionsRow: {
    flexDirection: 'row',
  },
  heroBtn: {
    shadowColor: '#3B2F22',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  heroBtnOutlined: {
    backgroundColor: 'rgba(255,255,255,0.34)',
    borderColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
  },
  heroShine: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.75)',
    opacity: 0.36,
  },
  search: {
    marginBottom: 12,
  },
  contentGrid: {
    gap: 18,
  },
  contentGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  sideColumn: {
    width: '100%',
  },
  sideColumnWide: {
    width: 340,
  },
  shortcutGrid: {
    gap: 10,
  },
  shortcutGridWide: {
    flexDirection: 'row',
  },
  horizontalList: {
    gap: 12,
    paddingRight: 16,
  },
  textAction: {
    fontWeight: '800',
    padding: 6,
  },
  tipPanel: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 16,
    marginTop: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.45)',
    shadowColor: '#3B2F22',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 5,
  },
  tipContent: {
    position: 'relative',
    zIndex: 2,
  },
  tipShine: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.72)',
    opacity: 0.38,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
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
  safetyModeCard: {
    padding: 20,
    minHeight: 140,
    justifyContent: 'center',
    marginVertical: 8,
  },
  safetyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  safetyCardTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1.2,
  },
  safetyCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  safetyCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.90)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
