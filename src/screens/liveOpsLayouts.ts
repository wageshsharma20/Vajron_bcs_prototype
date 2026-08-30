/**
 * The Live Ops arrangements under consideration.
 *
 * Same components in every one — camera feed, minimap, telemetry table, camera
 * controls, mission progress. What changes is where they sit and how much room
 * each gets. Two rules hold across all seven: the feed is the largest panel on
 * the screen, and the minimap is smaller than it.
 */
export type LiveOpsLayout =
  | 'wide'
  | 'stage'
  | 'inset'
  | 'console'
  | 'ribbon'
  | 'tower'
  | 'deck';

export const LIVE_OPS_LAYOUTS: { id: LiveOpsLayout; label: string; note: string }[] = [
  {
    id: 'wide',
    label: 'Wide',
    note: 'Feed and map across the top, feed taking the larger share; readings in a band beneath.',
  },
  {
    id: 'stage',
    label: 'Stage',
    note: 'Feed full width. Map, readings and camera controls as three ruled columns under it.',
  },
  {
    id: 'inset',
    label: 'Inset',
    note: 'Feed fills the picture area; the map rides in its corner as an inset.',
  },
  {
    id: 'console',
    label: 'Console',
    note: 'Feed on the left at full height; map, readings and controls stacked in a right column.',
  },
  {
    id: 'ribbon',
    label: 'Ribbon',
    note: 'Feed full width with the six readings as a single strip beneath it; map and controls below.',
  },
  {
    id: 'tower',
    label: 'Tower',
    note: 'Feed left at full height; everything else, progress included, in a narrow right tower.',
  },
  {
    id: 'deck',
    label: 'Deck',
    note: 'Feed on top, readings and controls beneath, and the map as a wide strip along the foot.',
  },
];
