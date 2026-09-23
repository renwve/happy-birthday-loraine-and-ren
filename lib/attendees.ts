export const ATTENDEES = [
  'Loraine', 'Ren', 'Alexa', 'Eli',
  'Marie', 'Shayla', 'Sophia',
] as const;

export type AttendeeName = (typeof ATTENDEES)[number];
