export const ATTENDEES = [
  'Guest 1', 'Guest 2', 'Guest 3', 'Guest 4',
  'Guest 5', 'Guest 6', 'Guest 7',
] as const;

export type AttendeeName = (typeof ATTENDEES)[number];
