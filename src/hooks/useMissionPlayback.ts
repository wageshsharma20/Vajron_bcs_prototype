import { useEffect, useRef, useState } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';

/**
 * The recorded camera footage used when no real camera stream is connected
 * (the simulator and the demo).
 *
 * There used to be a second recording here -- the map with the flight path
 * drawing itself in -- kept in step with this one. The map is now a real map
 * driven by telemetry, so that clip is gone, and with it the cost of decoding
 * a second 13 MB video on the Pi and the loop that kept the two aligned.
 */
const LIVE_FEED = require('../../assets/video/live-feed.mp4');

/** How often the feed reports its position, and so how often progress advances. */
const TIME_UPDATE_INTERVAL_SEC = 0.25;

export type MissionPlayback = {
  feedPlayer: VideoPlayer;
  /** How far through the recording the footage is, 0-1 (demo mode only). */
  progress: number;
};

export function useMissionPlayback(isArmed: boolean, isPaused: boolean): MissionPlayback {
  const feedPlayer = useVideoPlayer(LIVE_FEED, p => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = TIME_UPDATE_INTERVAL_SEC;
  });

  const wasArmed = useRef(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sub = feedPlayer.addListener('timeUpdate', ({ currentTime }) => {
      const total = feedPlayer.duration;
      if (total > 0) setProgress(Math.min(1, Math.max(0, currentTime / total)));
    });
    return () => sub.remove();
  }, [feedPlayer]);

  useEffect(() => {
    // Landing rewinds the footage so the next take-off starts from the top.
    if (!isArmed && wasArmed.current) {
      feedPlayer.pause();
      feedPlayer.currentTime = 0;
      setProgress(0);
    }
    wasArmed.current = isArmed;
    if (isArmed && !isPaused) feedPlayer.play();
    else feedPlayer.pause();
  }, [isArmed, isPaused, feedPlayer]);

  return { feedPlayer, progress };
}
