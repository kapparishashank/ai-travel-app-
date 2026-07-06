import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

export type SegmentedTabsOption = {
  label: string;
  value: string;
};

export type SegmentedTabsProps = {
  options: SegmentedTabsOption[];
  value: string;
  onChange: (value: string) => void;
  name: string;
  ariaLabel?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedTabs({
  options,
  value,
  onChange,
  name,
  ariaLabel,
  className,
  style,
}: SegmentedTabsProps) {
  const theme = useTheme();
  const [hoveredValue, setHoveredValue] = React.useState<string | null>(null);
  void className;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel ?? name}
      contentContainerStyle={styles.scrollContent}
      style={style}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {options.map((option) => {
          const selected = value === option.value;
          const id = `cir-${sanitizeId(name)}-${sanitizeId(option.value)}`;

          return (
            <Pressable
              key={option.value}
              nativeID={id}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              aria-selected={selected}
              onHoverIn={() => setHoveredValue(option.value)}
              onHoverOut={() => setHoveredValue((current) => (current === option.value ? null : current))}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.tab,
                selected && {
                  backgroundColor: theme.colors.surface,
                  shadowColor: theme.colors.shadow,
                  borderColor: theme.colors.outlineVariant,
                },
                hoveredValue === option.value && !selected && styles.hovered,
                pressed && styles.pressed,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: selected ? theme.colors.onSurface : theme.colors.onSurfaceVariant },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function sanitizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  tab: {
    minHeight: 38,
    minWidth: 72,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    transitionDuration: '180ms',
    transitionProperty: 'background-color, color, box-shadow, transform',
    transitionTimingFunction: 'ease',
  } as ViewStyle,
  hovered: {
    transform: [{ translateY: -1 }],
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
