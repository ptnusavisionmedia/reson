import { useEffect } from 'react';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Path dibuat sendiri (viewBox 120x120). Semua path < PATH_BUDGET sehingga dash-offset cukup untuk draw-on.
const PATH_BUDGET = 800;

export type IllustrationName = 'headphone' | 'iem' | 'waveform' | 'listener' | 'conversation';

const ART: Record<IllustrationName, { paths: string[]; dot: [number, number] }> = {
  headphone: {
    paths: [
      'M22 70 C22 28 98 28 98 70',
      'M22 64 Q12 64 12 74 V90 Q12 100 22 100 H28 V64 Z',
      'M98 64 Q108 64 108 74 V90 Q108 100 98 100 H92 V64 Z',
    ],
    dot: [60, 31],
  },
  iem: {
    paths: [
      'M24 90 C24 80 40 80 40 90 C40 102 24 102 24 90 Z',
      'M80 90 C80 80 96 80 96 90 C96 102 80 102 80 90 Z',
      'M32 80 C32 52 60 60 60 34 M88 80 C88 52 60 60 60 34 M60 34 V14',
    ],
    dot: [60, 14],
  },
  waveform: {
    paths: ['M8 60 H24 L32 38 L42 82 L52 28 L62 92 L72 44 L80 70 L88 60 H112'],
    dot: [112, 60],
  },
  listener: {
    paths: [
      'M44 46 A16 16 0 1 1 76 46 A16 16 0 1 1 44 46',
      'M24 112 C24 84 96 84 96 112',
      'M38 44 C38 14 82 14 82 44',
      'M34 42 H40 V56 H34 Z M80 42 H86 V56 H80 Z',
    ],
    dot: [60, 18],
  },
  conversation: {
    paths: [
      'M14 20 H72 V62 H40 L26 76 V62 H14 Z',
      'M52 74 H106 V100 H94 V112 L82 100 H52 Z',
    ],
    dot: [26, 76],
  },
};

/**
 * Line-art yang tergambar bertahap sekali saat `active` menjadi true.
 * Reduce Motion: langsung tampil selesai, tanpa animasi.
 */
export function DrawOnIllustration({ name, size = 200, active = true }: { name: IllustrationName; size?: number; active?: boolean }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    if (!active) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
  }, [active, reduceMotion, progress]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: PATH_BUDGET * (1 - progress.value) }));
  const dotProps = useAnimatedProps(() => ({ opacity: progress.value > 0.92 ? 1 : 0 }));
  const { paths, dot } = ART[name];

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {paths.map((d) => (
        <AnimatedPath
          key={d}
          d={d}
          fill="none"
          stroke={colors.text}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${PATH_BUDGET} ${PATH_BUDGET}`}
          animatedProps={lineProps}
        />
      ))}
      <AnimatedCircle cx={dot[0]} cy={dot[1]} r={3} fill={colors.accent} animatedProps={dotProps} />
    </Svg>
  );
}
