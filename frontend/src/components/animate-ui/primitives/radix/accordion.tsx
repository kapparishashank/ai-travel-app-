import React, { createContext, useContext, useMemo, useRef } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

type AccordionType = 'single' | 'multiple';

type AccordionContextValue = {
  type: AccordionType;
  values: string[];
  collapsible: boolean;
  toggle: (value: string) => void;
};

type AccordionItemContextValue = {
  value: string;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type AccordionProps = {
  children: React.ReactNode;
  type?: AccordionType;
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function Accordion({
  children,
  type = 'single',
  collapsible = false,
  value,
  defaultValue,
  onValueChange,
  style,
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => normalizeValue(defaultValue));
  const values = value === undefined ? internalValue : normalizeValue(value);

  const contextValue = useMemo<AccordionContextValue>(
    () => ({
      type,
      values,
      collapsible,
      toggle: (itemValue: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const isOpen = values.includes(itemValue);
        let next: string[];

        if (type === 'multiple') {
          next = isOpen ? values.filter((current) => current !== itemValue) : [...values, itemValue];
        } else if (isOpen) {
          next = collapsible ? [] : values;
        } else {
          next = [itemValue];
        }

        if (value === undefined) setInternalValue(next);
        onValueChange?.(type === 'multiple' ? next : next[0] ?? '');
      },
    }),
    [collapsible, onValueChange, type, value, values],
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      <View style={[styles.root, style]}>{children}</View>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps = {
  children: React.ReactNode;
  value: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function AccordionItem({ children, value, style }: AccordionItemProps) {
  const theme = useTheme();
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <View style={[styles.item, { borderColor: theme.colors.outlineVariant }, style]}>{children}</View>
    </AccordionItemContext.Provider>
  );
}

export type AccordionHeaderProps = {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function AccordionHeader({ children, style }: AccordionHeaderProps) {
  return <View style={style}>{children}</View>;
}

export type AccordionTriggerProps = {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function AccordionTrigger({ children, style, textStyle, accessibilityLabel }: AccordionTriggerProps) {
  const accordion = useRequiredAccordionContext();
  const item = useRequiredAccordionItemContext();
  const theme = useTheme();
  const [hovered, setHovered] = React.useState(false);
  const isOpen = accordion.values.includes(item.value);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: isOpen }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => accordion.toggle(item.value)}
      style={({ pressed }) => [
        styles.trigger,
        { backgroundColor: hovered ? theme.colors.surfaceVariant : 'transparent' },
        pressed && styles.triggerPressed,
        style,
      ]}
    >
      <View style={styles.triggerContent}>{renderTriggerChildren(children, textStyle, theme.colors.onSurface)}</View>
      <MaterialCommunityIcons
        name={isOpen ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={theme.colors.onSurfaceVariant}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export type AccordionContentProps = {
  children: React.ReactNode;
  keepRendered?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function AccordionContent({ children, keepRendered = false, style }: AccordionContentProps) {
  const accordion = useRequiredAccordionContext();
  const item = useRequiredAccordionItemContext();
  const isOpen = accordion.values.includes(item.value);
  const opacity = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: isOpen ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [isOpen, opacity]);

  if (!isOpen && !keepRendered) return null;

  return (
    <Animated.View
      style={[
        styles.content,
        !isOpen && styles.hiddenContent,
        {
          opacity,
          transform: [
            {
              translateY: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-4, 0],
              }),
            },
          ],
        },
        style,
      ]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}

function normalizeValue(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function useRequiredAccordionContext() {
  const value = useContext(AccordionContext);
  if (!value) throw new Error('Accordion components must be rendered inside Accordion.');
  return value;
}

function useRequiredAccordionItemContext() {
  const value = useContext(AccordionItemContext);
  if (!value) throw new Error('AccordionTrigger and AccordionContent must be rendered inside AccordionItem.');
  return value;
}

function renderTriggerChildren(children: React.ReactNode, textStyle: StyleProp<TextStyle>, color: string) {
  if (typeof children === 'string' || typeof children === 'number') {
    return <Text style={[styles.triggerText, { color }, textStyle]}>{children}</Text>;
  }
  return children;
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trigger: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    transitionDuration: '180ms',
    transitionProperty: 'background-color, transform',
    transitionTimingFunction: 'ease-out',
  } as ViewStyle,
  triggerPressed: {
    transform: [{ scale: 0.98 }],
  },
  triggerContent: {
    flex: 1,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  hiddenContent: {
    height: 0,
    overflow: 'hidden',
  },
});
