import { useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { LENGTHS } from './illustrationLengths';
import { ART, type IllustrationName } from './illustrationPaths';

export type { IllustrationName } from './illustrationPaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MS_PER_UNIT = 11; // kecepatan "pena": makin panjang gambar, makin lama
const MIN_MS = 2400;
const MAX_MS = 3600;
const DOT_MS = 900;

/** Satu goresan. Hanya bergerak di antara progres `start` dan `end` miliknya, jadi goresan digambar berurutan. */
function Stroke({ d, len, start, end, progress }: { d: string; len: number; start: number; end: number; progress: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / (end - start)));
    return { strokeDashoffset: len * (1 - t) };
  });
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={colors.text}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Dash memakai panjang jalur yang SEBENARNYA (bukan angka besar tebakan), sehingga seluruh
      // durasi animasi terpakai untuk menggambar dan tidak selesai di awal lalu diam.
      strokeDasharray={`${len + 0.5} ${len + 0.5}`}
      animatedProps={props}
    />
  );
}

/**
 * Line-art yang digambar bertahap seperti ditarik pena: goresan satu per satu dengan kecepatan
 * konstan, awal dan akhir yang lembut, lalu titik coral muncul perlahan. Diputar sekali saat
 * `active` menjadi true. Reduce Motion: langsung tampil utuh, tanpa animasi.
 */
export function DrawOnIllustration({ name, size = 200, active = true }: { name: IllustrationName; size?: number; active?: boolean }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const dotProgress = useSharedValue(reduceMotion ? 1 : 0);

  const { paths, dot } = ART[name];
  const lengths = LENGTHS[name];
  const total = lengths.reduce((s, l) => s + l, 0);
  const duration = Math.min(MAX_MS, Math.max(MIN_MS, total * MS_PER_UNIT));

  // Jendela waktu tiap goresan sebanding dengan panjangnya, sehingga kecepatan pena merata.
  const windows = useMemo(
    () =>
      lengths.map((l, i) => {
        const before = lengths.slice(0, i).reduce((s, x) => s + x, 0);
        return { start: before / total, end: (before + l) / total };
      }),
    [lengths, total],
  );

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      dotProgress.value = 1;
      return;
    }
    if (!active) return;
    progress.value = 0;
    dotProgress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.bezier(0.45, 0, 0.25, 1) });
    dotProgress.value = withDelay(duration - 200, withTiming(1, { duration: DOT_MS, easing: Easing.out(Easing.cubic) }));
    return () => {
      cancelAnimation(progress);
      cancelAnimation(dotProgress);
    };
  }, [active, reduceMotion, duration, progress, dotProgress]);

  const dotProps = useAnimatedProps(() => ({ opacity: dotProgress.value, r: 1.5 + 2.2 * dotProgress.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {paths.map((d, i) => (
        <Stroke key={d} d={d} len={lengths[i]} start={windows[i].start} end={windows[i].end} progress={progress} />
      ))}
      <AnimatedCircle cx={dot[0]} cy={dot[1]} fill={colors.accent} animatedProps={dotProps} />
    </Svg>
  );
}
