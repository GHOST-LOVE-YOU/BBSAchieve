import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Brand
    primary: '#1863dc',
    primarySoft: '#2e77e5',
    onPrimary: '#fdfdfd',

    // Surface
    canvas: '#f6e9d8',
    canvasSoft: '#f9efe4',
    canvasCream: '#f0e4d6',
    surface: '#fdfdfd',
    surfaceBlush: '#fce0e0',
    surfaceButter: '#f7e6a1',
    surfaceSage: '#c3dfc7',
    surfaceSky: '#dbe7f2',
    surfacePeach: '#f9d9c4',
    surfaceMauve: '#efd4e3',

    // Text
    text: '#000000',
    ink: '#2d2f34',
    inkStrong: '#000000',
    inkSecondary: '#3f434a',
    inkTertiary: '#5e646e',
    ash: '#969ca6',
    mute: '#acb1b9',

    // Hairlines
    hairline: '#d8dadf',
    hairlineSoft: '#e4e2dc',

    // Tags
    tagYellowBg: '#f7e6a1',
    tagYellowInk: '#7f6c1f',
    tagGreenBg: '#c3dfc7',
    tagGreenInk: '#547358',
    tagBlueBg: '#dbe7f2',
    tagBlueInk: '#446aa7',
    tagMauveBg: '#efd4e3',
    tagMauveInk: '#b1729b',
    tagTurquoiseBg: '#cfe2e7',
    tagTurquoiseInk: '#437184',
    tagRedBg: '#f4d6d6',
    tagRedInk: '#bf6969',

    // Semantic
    error: '#bf6969',
    success: '#547358',

    // Compat aliases
    background: '#f6e9d8',
    backgroundElement: '#f0e4d6',
    backgroundSelected: '#e4e2dc',
    textSecondary: '#5e646e',
  },
  dark: {
    // Brand
    primary: '#2e77e5',
    primarySoft: '#5a98ee',
    onPrimary: '#0c0d10',

    // Surface
    canvas: '#0c0d10',
    canvasSoft: '#15171c',
    canvasCream: '#1d1f25',
    surface: '#1d1f25',
    surfaceBlush: '#3a1a25',
    surfaceButter: '#3a3215',
    surfaceSage: '#1d3326',
    surfaceSky: '#1a2839',
    surfacePeach: '#3a251a',
    surfaceMauve: '#321f2c',

    // Text
    text: '#ffffff',
    ink: '#ffffff',
    inkStrong: '#ffffff',
    inkSecondary: 'rgba(255,255,255,0.72)',
    inkTertiary: 'rgba(255,255,255,0.55)',
    ash: 'rgba(255,255,255,0.40)',
    mute: 'rgba(255,255,255,0.28)',

    // Hairlines
    hairline: 'rgba(255,255,255,0.10)',
    hairlineSoft: 'rgba(255,255,255,0.06)',

    // Tags
    tagYellowBg: '#3a3215',
    tagYellowInk: '#f7e6a1',
    tagGreenBg: '#1d3326',
    tagGreenInk: '#a8d0ad',
    tagBlueBg: '#1a2839',
    tagBlueInk: '#9bb6dc',
    tagMauveBg: '#321f2c',
    tagMauveInk: '#e6b9d3',
    tagTurquoiseBg: '#13282e',
    tagTurquoiseInk: '#9ec4ce',
    tagRedBg: '#3a1a1a',
    tagRedInk: '#e6a3a3',

    // Semantic
    error: '#e6a3a3',
    success: '#a8d0ad',

    // Compat aliases
    background: '#0c0d10',
    backgroundElement: '#1d1f25',
    backgroundSelected: '#262931',
    textSecondary: 'rgba(255,255,255,0.55)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, 'Noto Sans SC', var(--font-display)",
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 42,
  pillLg: 50,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
