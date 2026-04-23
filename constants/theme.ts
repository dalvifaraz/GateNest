import { Platform } from 'react-native';

export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  background: '#f5f6fa',
  white: '#ffffff',
  text: '#1a1a2e',
  textMuted: '#888888',
  border: '#e0e0e0',
  card: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
};

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';
