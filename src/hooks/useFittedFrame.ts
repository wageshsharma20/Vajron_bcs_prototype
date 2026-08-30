import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * frame instead of shrinking it, and the picture inside is squashed. CSS cannot
 * express "contain" on a box with both axes auto, so the size has to be solved
 * from a measurement.
 *
 * Both paths below feed that measurement. `onLayout` is the portable one and is
 * what native uses; on web the hook also observes the node directly, because
 * react-native-web implements `onLayout` with a ResizeObserver of its own and a
 * second, explicit one is cheap insurance against that plumbing changing.
 *
 * Neither fires while the page is hidden — a suspended tab does not run the
 * observation loop — so the pre-measure fallback has to be sane rather than
 * empty. It drives the frame from width, which is correct whenever width is the
 * tighter dimension and merely too tall when it is not.
 */
export function useFittedFrame(aspect: number) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const ref = useRef<any>(null);

  const record = useCallback((width: number, height: number) => {
    setBox((prev) =>
      prev && Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
        ? prev
        : { width, height },
    );
  }, []);

  /** Native path. */
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      record(width, height);
    },
    [record],
  );

  /** Web path: react-native-web forwards the ref to the underlying element. */
  useEffect(() => {
    const node = ref.current as Element | null;
    if (!node || typeof ResizeObserver === 'undefined' || !(node instanceof Element)) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) record(r.width, r.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [record]);

  // Until a measurement lands the frame is driven by width, which is right
  // whenever width is the tighter dimension and is corrected on the next frame
  // when it is not. Rendering nothing until measured put a blank flash on every
  // mount instead.
  const style = useMemo<ViewStyle>(() => {
    if (!box || box.width <= 0 || box.height <= 0) {
      return { width: '100%', aspectRatio: aspect, maxHeight: '100%' };
    }
    const width = Math.min(box.width, box.height * aspect);
    return { width, height: width / aspect };
  }, [box, aspect]);

  return { ref, onLayout, style };
}
