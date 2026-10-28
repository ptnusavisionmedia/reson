import Svg, { Path } from 'react-native-svg';

export type TabIconName = 'home' | 'community' | 'match' | 'explore' | 'profile';

// Ikon garis tipis buatan sendiri (viewBox 24x24). Sengaja bukan icon font: font harus diunduh
// saat runtime dan bisa gagal dimuat; SVG ikut ter-bundle bersama kode.
const PATHS: Record<TabIconName, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  community: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3 3 0 010 5.6M18 14.3c1.8.7 3 2.4 3 4.7',
  match: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  explore: 'M11 5a6 6 0 100 12 6 6 0 000-12zM16 16l4 4',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-7 8-7s8 3 8 7',
};

export function TabIcon({ name, color, size = 24 }: { name: TabIconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
