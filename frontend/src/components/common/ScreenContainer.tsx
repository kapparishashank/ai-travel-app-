import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { MountainPattern } from './MountainPattern';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  safeArea?: boolean;
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  children,
  scrollable = false,
  safeArea = true,
  keyboardAvoiding = true,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    { backgroundColor: theme.colors.background },
    safeArea && {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    style,
  ];

  let content = children;

  if (scrollable) {
    content = (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  } else {
    content = <View style={[styles.flex, contentContainerStyle]}>{children}</View>;
  }

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={containerStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.patternLayer}>
          <MountainPattern animated opacity={theme.dark ? 0.1 : 0.22} position="bottomRight" size="lg" />
          <MountainPattern opacity={theme.dark ? 0.06 : 0.14} position="topRight" size="md" />
          <View style={styles.contentLayer}>{content}</View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={containerStyle}>
      <View style={styles.patternLayer}>
        <MountainPattern animated opacity={theme.dark ? 0.1 : 0.22} position="bottomRight" size="lg" />
        <MountainPattern opacity={theme.dark ? 0.06 : 0.14} position="topRight" size="md" />
        <View style={styles.contentLayer}>{content}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  patternLayer: {
    flex: 1,
    overflow: 'hidden',
  },
  contentLayer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
});
