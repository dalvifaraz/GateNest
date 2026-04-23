import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useBottomInset() {
  const insets = useSafeAreaInsets();

  // On Android with gesture navigation, bottom inset is 0
  // On Android with button navigation, inset accounts for the nav bar
  // On iOS, inset accounts for home indicator
  return {
    bottomInset: insets.bottom,
    topInset: insets.top,
    hasHomeIndicator: insets.bottom > 0,
  };
}
