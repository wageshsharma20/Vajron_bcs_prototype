import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';

/**
 * Sizes a fixed-ratio frame to fit inside whatever slot it is given.
 *
 * The camera feed and the map are both recordings with one true aspect, and the
 * waypoint overlay is positioned as fractions of the frame — so the frame's box
 * has to be the picture's box exactly, or the markers drift off the ground they
 * mark.
 *
 * Styling it as `width: '100%'` plus `aspectRatio` plus `maxHeight: '100%'` does
 * not do that. Width is definite in that combination, so a short slot clips the
 * frame instead of shrinking it, and the picture inside is squashed or cropped.
 * That went unnoticed while every layout gave the media a wide, tall slot; the
 * stacked plans, which give it a wide, short one, made it obvious.
 *
 * Measuring the slot and solving for the larger of the two fitting sizes is the
 * only way to get "contain" behaviour while keeping the frame's own box honest.
 * On web `onLayout` is a ResizeObserver, so it re-fires whenever the layout
 * changes the slot — which is exactly when this needs to recompute.
 */
export function useFittedFrame(aspect: number) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((prev) =>
      prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
        ? prev
        : { width, height },
    );
  }, []);

  // Before the first measurement there is nothing to solve with, so the frame
  // falls back to being driven by width — which is right whenever width is the
  // tighter dimension, and is corrected on the very next frame when it is not.
  // Rendering nothing until measured instead put a blank flash on every mount.
  const style = useMemo<ViewStyle>(() => {
    if (!box || box.width <= 0 || box.height <= 0) {
      return { width: '100%', aspectRatio: aspect, maxHeight: '100%' };
    }
    const width = Math.min(box.width, box.height * aspect);
    return { width, height: width / aspect };
  }, [box, aspect]);

  return { onLayout, style };
}
