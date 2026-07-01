import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';

type AuthScreenHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthScreenHeader({ title, subtitle }: AuthScreenHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <Text style={[styles.brand, { color: theme.colors.primary }]}>TravelAI</Text>
      <Text style={[styles.title, { color: theme.colors.onBackground }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 28,
  },
  brand: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
});
