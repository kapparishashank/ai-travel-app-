import React from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

type MountainPatternProps = {
  opacity?: number;
  size?: 'sm' | 'md' | 'lg';
  position?: 'topRight' | 'bottomRight' | 'bottomLeft' | 'center';
  animated?: boolean;
};

const WEB_SVG = `
<svg width="920" height="520" viewBox="0 0 920 520" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M-24 356 C36 314 74 266 126 244 C148 222 170 204 188 246 C222 270 258 312 322 374 C292 322 260 278 302 244 C354 204 402 154 436 104 C468 62 486 30 508 28 C526 78 564 104 594 130 C622 154 620 180 646 198 C690 246 730 272 758 248 C788 222 822 194 944 166" stroke="#171717" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M190 246 C184 266 178 286 170 302 C160 286 150 270 144 252 C158 236 174 222 188 208" stroke="#171717" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M310 246 C306 268 296 288 280 306 C300 294 318 272 326 248 C342 262 352 278 356 298" stroke="#171717" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M508 28 C504 64 490 96 468 122 C490 108 514 78 528 38" stroke="#171717" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M752 248 C774 232 790 210 800 186 C816 196 822 218 826 238" stroke="#171717" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M710 270 C744 246 776 224 820 210" stroke="#171717" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M124 244 C76 272 34 314 -16 366" stroke="#171717" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M246 286 C266 322 294 354 326 374" stroke="#171717" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M232 286 C238 274 244 268 252 280 C256 286 258 294 260 302" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M262 292 C266 280 272 276 282 286" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M260 120 C234 132 218 158 222 188 C226 218 250 240 282 244 C260 232 246 208 250 180 C254 154 270 132 294 122 C282 118 270 116 260 120Z" stroke="#171717" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SIZE_STYLES = {
  sm: { width: 260, height: 148, backgroundSize: '260px 148px' },
  md: { width: 420, height: 238, backgroundSize: '420px 238px' },
  lg: { width: 760, height: 430, backgroundSize: '760px 430px' },
};

export function MountainPattern({
  opacity = 0.18,
  size = 'lg',
  position = 'bottomRight',
  animated = false,
}: MountainPatternProps) {
  const [drift] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (!animated) return undefined;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 14000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 14000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animated, drift]);

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const sizeStyle = SIZE_STYLES[size];
  const shellStyle = [
    styles.base,
    styles[position],
    { width: sizeStyle.width, height: sizeStyle.height, opacity },
    animated && { transform: [{ translateX }] },
  ];

  if (Platform.OS === 'web') {
    const encoded = encodeURIComponent(WEB_SVG).replace(/'/g, '%27').replace(/"/g, '%22');
    return React.createElement('div', {
      'aria-hidden': true,
      style: {
        position: 'absolute',
        pointerEvents: 'none',
        width: sizeStyle.width,
        height: sizeStyle.height,
        opacity,
        backgroundImage: `url("data:image/svg+xml,${encoded}")`,
        backgroundRepeat: size === 'lg' ? 'repeat-x' : 'no-repeat',
        backgroundPosition: 'center bottom',
        backgroundSize: sizeStyle.backgroundSize,
        ...webPosition(position),
      },
    });
  }

  return (
    <Animated.View pointerEvents="none" style={shellStyle}>
      <View style={[styles.nativeMoon, size === 'sm' && styles.nativeMoonSmall]} />
      <View style={[styles.nativeLine, styles.nativeLineOne]} />
      <View style={[styles.nativeLine, styles.nativeLineTwo]} />
      <View style={[styles.nativeLine, styles.nativeLineThree]} />
      <View style={[styles.nativeLine, styles.nativeLineFour]} />
    </Animated.View>
  );
}

function webPosition(position: NonNullable<MountainPatternProps['position']>) {
  switch (position) {
    case 'topRight':
      return { top: -54, right: -72 };
    case 'bottomLeft':
      return { bottom: -78, left: -92 };
    case 'center':
      return { top: '34%', left: '50%', transform: 'translateX(-50%)' };
    case 'bottomRight':
    default:
      return { bottom: -82, right: -96 };
  }
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
  },
  topRight: {
    top: -54,
    right: -72,
  },
  bottomRight: {
    bottom: -82,
    right: -96,
  },
  bottomLeft: {
    bottom: -78,
    left: -92,
  },
  center: {
    top: '34%',
    alignSelf: 'center',
  },
  nativeMoon: {
    position: 'absolute',
    left: 96,
    top: 54,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#171717',
    transform: [{ rotate: '-24deg' }],
  },
  nativeMoonSmall: {
    left: 44,
    top: 32,
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  nativeLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#171717',
    borderRadius: 2,
  },
  nativeLineOne: {
    left: 0,
    bottom: 48,
    width: 250,
    transform: [{ rotate: '-30deg' }],
  },
  nativeLineTwo: {
    left: 160,
    bottom: 102,
    width: 280,
    transform: [{ rotate: '-48deg' }],
  },
  nativeLineThree: {
    left: 360,
    bottom: 116,
    width: 260,
    transform: [{ rotate: '38deg' }],
  },
  nativeLineFour: {
    right: 8,
    bottom: 90,
    width: 250,
    transform: [{ rotate: '-26deg' }],
  },
});
