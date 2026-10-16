import { create } from 'zustand';

/**
 * How much the numbers on screen can be trusted.
 *
 * 'demo'  no aircraft has ever been seen; the figures are a canned replay.
 * 'live'  a real vehicle is sending heartbeats right now.
 * 'lost'  a real vehicle WAS sending and has stopped.
 *
 * The one transition that must never exist is live -> demo. If a link drops
 * mid-flight and the canned replay quietly resumed, the operator would be
 * watching a smooth, plausible, entirely fictional aircraft. Once this store
 * has been live it can only go to 'lost', and the replay never restarts.
 */
export type LinkMode = 'demo' | 'sim' | 'live' | 'lost';
// 'sim': a simulated aircraft running inside the page (services/simulator).
// It behaves like a real link for every screen, but is labelled as simulated
// and is never 'everLive': a real aircraft replaces it (sim -> live), and
// losing that real aircraft goes to 'lost', never back to 'sim'.

interface LinkStore {
  mode: LinkMode;
  /** Is the HTTP stream itself open? Separate from whether a vehicle is on it. */
  transportUp: boolean;
  packets: number;
  lastFrameAt: number | null;
  everLive: boolean;
  /** Which aircraft the live stream describes. One bridge feeds ONE aircraft;
   *  every other drone in the fleet list has no link at all. */
  liveDroneId: string | null;

  /** `lastFrameAt` is when the AIRCRAFT last spoke, not when this message
   *  arrived — see mavlinkLink for why those are different. */
  markLive: (packets: number, lastFrameAt?: number, droneId?: string) => void;
  markTransport: (up: boolean) => void;
  markSilent: () => void;
  markSim: (droneId: string) => void;
}

export const useLinkStore = create<LinkStore>((set, get) => ({
  mode: 'demo',
  transportUp: false,
  packets: 0,
  lastFrameAt: null,
  everLive: false,
  liveDroneId: null,

  markLive: (packets, lastFrameAt = Date.now(), droneId) =>
    set(state => ({
      mode: 'live', everLive: true, transportUp: true, packets, lastFrameAt,
      liveDroneId: droneId ?? state.liveDroneId,
    })),

  markTransport: up =>
    set(state => ({
      transportUp: up,
      // Losing the stream after a real vehicle has been seen is a lost link,
      // not a return to the demo.
      mode: !up && state.everLive ? 'lost' : state.mode,
    })),

  markSilent: () => {
    if (get().everLive) set({ mode: 'lost' });
  },

  // Only from demo. Never over a real link, live or lost.
  markSim: droneId => {
    if (!get().everLive) set({ mode: 'sim', liveDroneId: droneId });
  },
}));
