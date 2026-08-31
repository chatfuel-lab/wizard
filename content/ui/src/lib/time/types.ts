/**
 * The two vocabulary types shared by `calendarDate` and `timezone`. They live
 * in a leaf module of their own because the two files need each other's names:
 * `calendarDate` calls `wallClockIn` (a value import) and `timezone` types its
 * signatures with `DayKey`/`Weekday`. Importing across in both directions made
 * a cycle; this file is the end both can point at. `calendarDate` re-exports
 * both types, so its importers keep reading them from where they always have.
 */

/** `YYYY-MM-DD`. */
export type DayKey = string;
/** 0 = Sunday … 6 = Saturday, the `Date.getDay()` convention. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
