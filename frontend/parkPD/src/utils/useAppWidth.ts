import { Platform, useWindowDimensions } from 'react-native';
import { APP_MAX_WIDTH } from '../theme';

/**
 * How many points wide the app is drawn - which on the web is not the window.
 *
 * The grids in this app are sized in points computed from a known width rather
 * than in percentages - the calendar's seven columns, the tablet tiles - for
 * the measuring reasons `gridMetrics` and `tileMetrics` set out. That
 * arithmetic needs the width of what the row is actually drawn inside, and the
 * web build caps that at `APP_MAX_WIDTH` however wide the browser is. Divided
 * out of the window instead, a desktop calendar cell came out around 200pt and
 * two days filled a card built to hold seven.
 *
 * On native the window is the app, so this is the window's width unchanged -
 * every phone and tablet keeps the layout it had.
 */
export function useAppWidth() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' ? Math.min(width, APP_MAX_WIDTH) : width;
}
