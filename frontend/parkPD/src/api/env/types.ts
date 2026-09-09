/**
 * The shape every module in this directory has to have.
 *
 * The bundler swaps which of `local.ts` / `test.ts` / `prod.ts` sits behind the
 * `parkpd/env` specifier, so all three must stay interchangeable. TypeScript
 * only ever resolves that specifier to one of them, so a field that went
 * missing from another would not surface until that build ran - annotating each
 * export with this type is what closes that gap.
 */
export type ApiEnvironment = {
  /** Which file won. Read back by the app so a build can identify itself. */
  readonly name: 'local' | 'test' | 'prod';
  /** Origin the API client prefixes onto every request path. No trailing slash. */
  readonly apiBaseUrl: string;
};
