/**
 * Web entry point. The native entry stays in index.js — this mirrors it for the
 * DOM, where AppRegistry has to be told which element to mount into.
 */
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

/**
 * react-native-web mounts into a DOM element, whereas the native typings
 * describe `rootTag` as an opaque native handle. Types are checked against
 * react-native and only swapped for react-native-web at bundle time, so the
 * parameters are cast across that gap.
 */
const parameters = {
  initialProps: {},
  rootTag: document.getElementById('root'),
} as unknown as Parameters<typeof AppRegistry.runApplication>[1];

AppRegistry.runApplication(appName, parameters);
