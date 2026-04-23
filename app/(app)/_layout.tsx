import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
          height: 56 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name='dashboard'
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji='🏠' focused={focused} />,
        }}
      />
      <Tabs.Screen
        name='visitors'
        options={{
          title: 'Visitors',
          tabBarIcon: ({ focused }) => <TabIcon emoji='👤' focused={focused} />,
        }}
      />
      <Tabs.Screen
        name='announcements'
        options={{
          title: 'Notice',
          tabBarIcon: ({ focused }) => <TabIcon emoji='📢' focused={focused} />,
        }}
      />
      <Tabs.Screen
        name='amenities'
        options={{
          title: 'Amenities',
          tabBarIcon: ({ focused }) => <TabIcon emoji='🏊' focused={focused} />,
        }}
      />
      <Tabs.Screen
        name='payments'
        options={{
          title: 'Payments',
          tabBarIcon: ({ focused }) => <TabIcon emoji='💳' focused={focused} />,
        }}
      />
    </Tabs>
  );
}
