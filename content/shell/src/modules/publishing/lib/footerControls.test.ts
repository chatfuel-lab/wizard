import { describe, expect, it } from 'vitest';
import { footerControls } from './footerControls';

const at = '2026-08-25T08:00:00.000Z';

describe('the composer footer', () => {
  it('publishes now while no time is set', () => {
    expect(footerControls({ scheduledAt: null, canSchedule: true, band: 'wide' })).toEqual({
      split: true,
      cancel: true,
      intent: 'publish',
      primaryLabel: 'Publish now',
    });
  });

  it('schedules once a time is', () => {
    expect(footerControls({ scheduledAt: at, canSchedule: true, band: 'wide' })).toEqual({
      split: true,
      cancel: true,
      intent: 'schedule',
      primaryLabel: 'Schedule post',
    });
  });

  it('drops the split where nothing could honour a time', () => {
    /* The other half is absent, so the primary must not be left with a flat
       left edge waiting for it. */
    const controls = footerControls({ scheduledAt: null, canSchedule: false, band: 'wide' });
    expect(controls.split).toBe(false);
    expect(controls.primaryLabel).toBe('Publish now');
  });

  it('still means schedule if a time survived on the draft', () => {
    /* A post written on a deployment that had a scheduler, opened on one that
       does not. The composer clears the time; until it has, what the button
       means still follows the draft rather than the deployment. */
    expect(footerControls({ scheduledAt: at, canSchedule: false, band: 'wide' }).intent).toBe('schedule');
  });

  it('keeps its own Cancel only where the strip has room for a fourth control', () => {
    /* Narrow, the strip would wrap and the primary would move; the panel closes
       from its own header, from Escape and from the scrim regardless. */
    for (const band of ['wide', 'inline'] as const) {
      expect(footerControls({ scheduledAt: at, canSchedule: true, band }).cancel).toBe(true);
    }
    for (const band of ['compact', 'narrow'] as const) {
      expect(footerControls({ scheduledAt: at, canSchedule: true, band }).cancel).toBe(false);
    }
  });

  it('holds one label while the publish is in flight, whichever it was', () => {
    expect(footerControls({ scheduledAt: null, canSchedule: true, publishing: true, band: 'wide' }).primaryLabel).toBe(
      'Publishing',
    );
    expect(footerControls({ scheduledAt: at, canSchedule: true, publishing: true, band: 'wide' }).primaryLabel).toBe(
      'Publishing',
    );
  });
});
