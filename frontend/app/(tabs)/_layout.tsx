import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, type ViewStyle } from 'react-native';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs';

function AnimatedTabBarButton({
  style,
  disabled,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...props
}: BottomTabBarButtonProps) {
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  return (
    <PlatformPressable
      {...props}
      disabled={disabled}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        style,
        styles.tabBarButton,
        !disabled && hovered && styles.tabBarButtonHovered,
        !disabled && pressed && styles.tabBarButtonPressed,
      ]}
    />
  );
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.onBackground,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet-travel" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="currency-inr" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="plan-trip" options={{ href: null }} />
      <Tabs.Screen name="smart-journey" options={{ href: null }} />
      <Tabs.Screen name="ticket-finder" options={{ href: null }} />
      <Tabs.Screen name="budget-discovery" options={{ href: null }} />
      <Tabs.Screen name="price-alerts" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="packing" options={{ href: null }} />
      <Tabs.Screen name="safety-mode" options={{ href: null }} />
      <Tabs.Screen name="destination/[id]" options={{ href: null }} />
      <Tabs.Screen name="search/[id]" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]" options={{ href: null }} />
      <Tabs.Screen name="trip-generation/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarButton: {
    transitionDuration: '180ms',
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease-out',
  } as ViewStyle,
  tabBarButtonHovered: {
    transform: [{ scale: 1.04 }],
  },
  tabBarButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
});
