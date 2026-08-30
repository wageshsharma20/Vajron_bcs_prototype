import type { LayoutOption } from '../components/LayoutSwitcher';

/**
 * The Mission Planner arrangements under consideration.
 *
 * Same pieces in every one — the survey map, the three flight parameters, the
 * clear/generate actions, the pre-flight checks and the launch control. What
 * changes is where they sit and how much room each gets.
 *
 * Planning is a map task, so the map is the working surface in all seven; they
 * differ in how much of the page it gets and where the controls sit relative to
 * it — beside, above, below, or wrapped around it.
 */
export type PlanLayout =
  | 'sidebar'
  | 'atlas'
  | 'rail'
  | 'brief'
  | 'header'
  | 'split'
  | 'tower';

export const PLAN_LAYOUTS: readonly LayoutOption<PlanLayout>[] = [
  {
    id: 'sidebar',
    label: 'Sidebar',
    note: 'Parameters and checks in a left column, map filling the rest.',
  },
  {
    id: 'atlas',
    label: 'Atlas',
    note: 'Map full width across the top; parameters, checks and launch as three columns beneath.',
  },
  {
    id: 'rail',
    label: 'Rail',
    note: 'A narrow rail of parameters beside the map, with checks and launch as a footer band.',
  },
  {
    id: 'brief',
    label: 'Brief',
    note: 'Map on the left, the whole brief — parameters, checks, launch — stacked on the right.',
  },
  {
    id: 'header',
    label: 'Header',
    note: 'Parameters as a strip across the top, map below it, checks and launch along the foot.',
  },
  {
    id: 'split',
    label: 'Split',
    note: 'Map on top; the band beneath divides into checks on the left and parameters on the right.',
  },
  {
    id: 'tower',
    label: 'Tower',
    note: 'Map takes the whole working area; everything else in a narrow right-hand tower.',
  },
];
