import { Tabs } from 'expo-router';

import { TabIcon, type TabIconName } from '@/components/ui/TabIcon';
import { colors } from '@/theme';

const tabs: { name: string; title: string; icon: TabIconName }[] = [
  { name: 'home', title: 'Beranda', icon: 'home' },
  { name: 'community', title: 'Community', icon: 'community' },
  { name: 'match', title: 'Match', icon: 'match' },
  { name: 'explore', title: 'Jelajah', icon: 'explore' },
  { name: 'profile', title: 'Profil', icon: 'profile' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}>
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{ title: t.title, tabBarIcon: ({ color, size }) => <TabIcon name={t.icon} color={color as string} size={size} /> }}
        />
      ))}
    </Tabs>
  );
}
