/** Limits and names shared by the smart-intake prompt and rulings. */

/** The model smart intake asks. ONE place: the route and the replay both read it, and a test holds the stored answers to it. */
export const INTAKE_MODEL = 'gemini-2.5-flash';

/** At most this many task lines from one sentence. More than this and the jeweler is told the rest were cut. */
export const TASK_CAP = 6;

export const MAX_PIECES = 20;
