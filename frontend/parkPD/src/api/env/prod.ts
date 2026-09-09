import type { ApiEnvironment } from './types';

/**
 * The Railway deployment, reached through our own domain rather than the
 * `*.up.railway.app` hostname it also answers to. Railway still terminates TLS
 * and nothing changes server-side - but the name is ours now, which is what
 * lets the backend be moved or rebuilt without every APK already on a phone
 * pointing at a host that no longer exists.
 *
 * HTTPS, so Android needs no cleartext exemption.
 */
export const environment: ApiEnvironment = {
  name: 'prod',
  apiBaseUrl: 'https://api.parthpd.in',
};
