import { useEffect, useRef, useState } from 'react';
import { useVideoPlayer, VideoPlayer } from 'expo-video';

/**
 * Owns the two clips that make up a mission replay: the downward camera feed and
 * the map with the flight path drawing itself in. They are two recordings of the
 * same 124-second sortie, so they only read as one flight if they are started
 * together and kept together.
 *
 * Both are driven from the flight state rather than from each other — the feed is
 * treated as the reference clock and the map is nudged back onto it whenever it
 * drifts. Correcting only past a threshold matters: seeking a video restarts its
 * decode, so correcting every tick would leave the map visibly stuttering.
 */
const LIVE_FEED = require('../../assets/video/live-feed.mp4');
const MAP_PATH = require('../../assets/video/map-path.mp4');

/** How far the map may drift from the feed before it is pulled back, in seconds. */
const DRIFT_TOLERANCE_SEC = 0.35;
const DRIFT_CHECK_MS = 1000;
/** How often the feed reports its position, and so how often progress advances. */
const TIME_UPDATE_INTERVAL_SEC = 0.25;

export type MissionPlayback = {
  feedPlayer: VideoPlayer;
  mapPlayer: VideoPlayer;
  /**
   * How far through the sortie the recordings are, 0-1.
   *
   * This is the mission's real clock. The telemetry loop is a separate mock that
   * cycles far faster than the flight it stands in for, so deriving progress
   * from it finished the route in a fraction of the runtime and lit every
   * waypoint while the aircraft was still visibly outbound.
   */
  progress: number;
};

export function useMissionPlayback(isArmed: boolean, isPaused: boolean): MissionPlayback {
  const feedPlayer = useVideoPlayer(LIVE_FEED, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = TIME_UPDATE_INTERVAL_SEC;
  });
  const mapPlayer = useVideoPlayer(MAP_PATH, (p) => {
    p.loop = true;
    p.muted = true;
  });

  const wasArmed = useRef(false);
  const [progress, setProgress] = useState(0);

  // The feed reports its own position; the map is slaved to it, so one listener
  // is enough for both.
  useEffect(() => {
    const sub = feedPlayer.addListener('timeUpdate', ({ currentTime }) => {
      const total = feedPlayer.duration;
      if (total > 0) setProgress(Math.min(1, Math.max(0, currentTime / total)));
    });
    return () => sub.remove();
  }, [feedPlayer]);

  useEffect(() => {
    const shouldPlay = isArmed && !isPaused;

    // Landing (or RTL) rewinds both clips so the next take-off starts the sortie
    // from the beginning rather than resuming mid-flight.
    if (!isArmed && wasArmed.current) {
      feedPlayer.pause();
      mapPlayer.pause();
      feedPlayer.currentTime = 0;
      mapPlayer.currentTime = 0;
      setProgress(0);
    }
    wasArmed.current = isArmed;

    if (shouldPlay) {
      // Re-align on every resume: a pause that lands mid-frame can leave the two
      // a beat apart even though neither advanced.
      mapPlayer.currentTime = feedPlayer.currentTime;
      feedPlayer.play();
      mapPlayer.play();
    } else {
      feedPlayer.pause();
      mapPlayer.pause();
    }
  }, [isArmed, isPaused, feedPlayer, mapPlayer]);

  useEffect(() => {
    if (!isArmed || isPaused) return;
    const id = setInterval(() => {
      const drift = Math.abs(mapPlayer.currentTime - feedPlayer.currentTime);
      // Ignore the huge apparent drift at a loop boundary, where one clip has
      // wrapped to zero and the other has not yet.
      if (drift > DRIFT_TOLERANCE_SEC && drift < 5) {
        mapPlayer.currentTime = feedPlayer.currentTime;
      }
    }, DRIFT_CHECK_MS);
    return () => clearInterval(id);
  }, [isArmed, isPaused, feedPlayer, mapPlayer]);

  return { feedPlayer, mapPlayer, progress };
}
