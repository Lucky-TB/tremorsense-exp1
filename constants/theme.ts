/**
 * Oura-inspired color palette for TremorSense.
 */

import { Platform } from 'react-native';

const tintColorLight = '#2D9B8A';
const tintColorDark = '#5CC5AB';

export const Colors = {
  light: {
    text: '#1C1C1E',
    background: '#F5F5F0',
    tint: tintColorLight,
    icon: '#6D6D72',
    tabIconDefault: '#6D6D72',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#E8E4DC',
    background: '#0D0D0D',
    tint: tintColorDark,
    icon: '#8A8A8E',
    tabIconDefault: '#6A6A6E',
    tabIconSelected: tintColorDark,
  },
};

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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
