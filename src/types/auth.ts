/** How the user identifies themselves. */
export type AuthMethod = 'email' | 'phone';

/** Which side of the flow the code is being verified for. */
export type AuthFlow = 'login' | 'signup';
