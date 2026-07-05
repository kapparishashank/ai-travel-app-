import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Searchbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../src/components/common/Button';
import { EmptyState } from '../../src/components/common/EmptyState';
import { ScreenContainer } from '../../src/components/common/ScreenContainer';
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

  return (
    <ScreenContainer safeArea={false} keyboardAvoiding={false}>
      <ScrollView
        contentContainerStyle={[styles.container, isWide && styles.wideContainer]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: theme.colors.onBackground }]}>
              Hi {firstName}, where next?
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Keep plans, prices, packing, and safety in one calm place.
            </Text>
          </View>
          <Button
            icon="plus"
            onPress={() => router.push('/(tabs)/plan-trip')}
            accessibilityLabel="Plan a Trip"
            style={styles.headerAction}
          >
            Plan a Trip
          </Button>
        </View>

        <Searchbar
          placeholder="Search destinations, trips, or routes"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submitSearch}
          onIconPress={submitSearch}
          accessibilityLabel="Search TravelAI"
          style={styles.search}
        />

        {loading ? (
          <>
            <SkeletonBlock height={112} />
            <SkeletonBlock height={92} />
            <SkeletonBlock height={180} />
          </>
        ) : (
          <View style={[styles.contentGrid, isWide && styles.contentGridWide]}>
            <View style={styles.mainColumn}>
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
                />
              )}

              {isTripNear && upcomingTrip && (
                <ShortcutCard
                  title="Packing reminder"
                  description={`${upcomingTrip.destination} is coming up soon. Review documents, weather gear, and shared items.`}
                  icon="bag-suitcase-outline"
                  onPress={() => router.push('/(tabs)/packing')}
                />
              )}

              {(activeTrip || upcomingTrip?.status === 'active') && (
                <ShortcutCard
                  title="Safety Mode"
                  description="Start check-ins and keep trusted contacts ready while traveling."
                  icon="shield-check-outline"
                  onPress={() => router.push('/(tabs)/safety-mode')}
                />
              )}

              <SectionHeader
                title="Active price alerts"
                action={
                  <Text
                    accessibilityRole="button"
                    onPress={() => router.push('/(tabs)/price-alerts')}
                    style={[styles.textAction, { color: theme.colors.primary }]}
                  >
                    View all
                  </Text>
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
                />
              )}

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
            </View>

            <View style={[styles.sideColumn, isWide && styles.sideColumnWide]}>
              <View style={[styles.tipPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={theme.colors.secondary} />
                <Text style={[styles.tipTitle, { color: theme.colors.onSurface }]}>First-time traveler tip</Text>
                <Text style={[styles.tipBody, { color: theme.colors.onSurfaceVariant }]}>
                  Start with dates and budget. You can skip preferences and refine the plan later.
                </Text>
              </View>

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
                />
              )}
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  headerAction: {
    minWidth: 128,
  },
  search: {
    borderRadius: 8,
    marginBottom: 8,
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
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
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
});
