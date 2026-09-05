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
export type LinkMode = 'demo' | 'live' | 'lost';

interface LinkStore {
  mode: LinkMode;
  /** Is the HTTP stream itself open? Separate from whether a vehicle is on it. */
  transportUp: boolean;
  packets: number;
  lastFrameAt: number | null;
  everLive: boolean;

  markLive: (packets: number) => void;
  markTransport: (up: boolean) => void;
  markSilent: () => void;
}

export const useLinkStore = create<LinkStore>((set, get) => ({
  mode: 'demo',
  transportUp: false,
  packets: 0,
  lastFrameAt: null,
  everLive: false,

  markLive: packets =>
    set({ mode: 'live', everLive: true, transportUp: true, packets, lastFrameAt: Date.now() }),

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
}));
