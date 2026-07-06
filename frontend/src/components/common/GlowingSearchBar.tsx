import React from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type GlowingSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function GlowingSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search',
  disabled = false,
  className,
  style,
}: GlowingSearchBarProps) {
  void className;
  const input =
    Platform.OS === 'web'
      ? React.createElement('input', {
          type: 'search',
          value,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value),
          onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') onSearch?.();
          },
          placeholder,
          disabled,
          'aria-label': 'Search',
          className: 'glow-search-input',
          style: webInputStyle,
        })
      : (
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSearch}
          placeholder={placeholder}
          placeholderTextColor="#9b8aa8"
          editable={!disabled}
          accessibilityLabel="Search"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      );

  return (
    <View style={[styles.wrapper, style]}>
      <View pointerEvents="none" style={[styles.glowLayer, styles.darkBorder]} />
      <View pointerEvents="none" style={[styles.glowLayer, styles.pinkGlow]} />
      <View pointerEvents="none" style={[styles.glowLayer, styles.violetGlow]} />
      <View pointerEvents="none" style={[styles.glowLayer, styles.outerBorder]} />

      <View style={[styles.main, disabled && styles.disabled]}>
        <MaterialCommunityIcons name="magnify" size={21} color="#f7d7ff" />
        {input}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          disabled={disabled}
          onPress={onSearch}
          style={({ pressed }) => [styles.action, pressed && !disabled && styles.actionPressed]}
        >
          <MaterialCommunityIcons name="arrow-right" size={18} color="#fff7ff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 520,
    minHeight: 72,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  glowLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    height: 56,
    borderRadius: 12,
  },
  darkBorder: {
    backgroundColor: '#17101f',
    borderWidth: 1,
    borderColor: '#3f244e',
  },
  pinkGlow: {
    left: 10,
    right: 10,
    top: 12,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#ff4fd8',
    opacity: 0.18,
    shadowColor: '#ff4fd8',
    shadowOpacity: 0.65,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  violetGlow: {
    left: 28,
    right: 28,
    top: 4,
    height: 64,
    borderRadius: 28,
    backgroundColor: '#7c3cff',
    opacity: 0.14,
    shadowColor: '#9a6cff',
    shadowOpacity: 0.6,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  outerBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255, 176, 245, 0.45)',
    backgroundColor: 'transparent',
  },
  main: {
    zIndex: 2,
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f0a16',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#d74cff',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    transitionDuration: '200ms',
    transitionProperty: 'border-color, box-shadow, transform',
    transitionTimingFunction: 'ease',
  } as ViewStyle,
  disabled: {
    opacity: 0.55,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    color: '#fff7ff',
    fontSize: 15,
    fontWeight: '600',
  },
  action: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    transitionDuration: '180ms',
    transitionProperty: 'transform, background-color',
    transitionTimingFunction: 'ease',
  } as ViewStyle,
  actionPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
});

const webInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 48,
  color: '#fff7ff',
  fontSize: 15,
  fontWeight: 600,
  background: 'transparent',
  border: 0,
  outline: 'none',
};
