import { describe, expect, it } from 'vitest';
import {
  describeTool,
  formatRunDuration,
  formatRunSummary,
  humanizeAction,
  rollUpRunState,
  TOOL_FAMILY_LABEL,
  type RunState,
} from './runStep';

describe('describeTool', () => {
  it("names an account mutation in the product's vocabulary", () => {
    expect(describeTool('chatfuel_gql-create_service')).toEqual({
      family: 'data',
      title: 'Create service',
      action: 'create_service',
      mutating: true,
    });
  });

  it('separates a read from a write inside the same family', () => {
    expect(describeTool('chatfuel_gql-list_catalog')).toMatchObject({
      family: 'data',
      title: 'List catalog',
      mutating: false,
    });
    expect(describeTool('chatfuel_gql-update_flow')).toMatchObject({ mutating: true });
    expect(describeTool('chatfuel_gql-find_contact')).toMatchObject({ mutating: false });
  });

  it('reads a frontend action as navigation, never as a mutation', () => {
    expect(describeTool('frontend_action-navigate')).toEqual({
      family: 'navigation',
      title: 'Open a screen',
      action: 'navigate',
      mutating: false,
    });
    expect(describeTool('frontend_action-suggest_quick_reply')).toMatchObject({
      family: 'navigation',
      title: 'Offer a reply',
    });
    /* "set_filter" would look mutating by its verb, and is not: a frontend
       action never reaches the account. */
    expect(describeTool('frontend_action-set_filter')).toMatchObject({ mutating: false });
  });

  it('turns a skill id into something a human recognises', () => {
    expect(describeTool('skill-booking_assistant_instr')).toEqual({
      family: 'skill',
      title: 'Booking assistant instructions',
      action: 'booking_assistant_instr',
      mutating: false,
    });
    expect(describeTool('skill-analytics_instr')).toMatchObject({ title: 'Analytics instructions' });
    expect(describeTool('skill-refund_policy')).toMatchObject({ title: 'Refund policy instructions' });
  });

  it('gives each built-in its own family, because each wants its own glyph', () => {
    expect(describeTool('get_frontend_state')).toMatchObject({ family: 'screen', title: 'Read your screen' });
    expect(describeTool('search_help_docs')).toMatchObject({ family: 'docs', title: 'Search the help docs' });
    expect(describeTool('fetch_url')).toMatchObject({ family: 'web', title: 'Read a web page' });
  });

  it('still describes a tool nobody has seen before', () => {
    expect(describeTool('summarize_thread')).toEqual({
      family: 'other',
      title: 'Summarize thread',
      action: 'summarize_thread',
      mutating: false,
    });
    expect(describeTool('chatfuel_gql-')).toMatchObject({ family: 'data', title: 'chatfuel_gql-' });
    expect(describeTool('')).toMatchObject({ family: 'other', title: '' });
  });

  it('has a label for every family, so a legend cannot go blank', () => {
    for (const family of Object.keys(TOOL_FAMILY_LABEL)) {
      expect(TOOL_FAMILY_LABEL[family as keyof typeof TOOL_FAMILY_LABEL]).not.toBe('');
    }
  });
});

describe('humanizeAction', () => {
  it('shouts an acronym instead of sentence-casing it', () => {
    expect(humanizeAction('get_api_key')).toBe('Get API key');
    expect(humanizeAction('api_status')).toBe('API status');
    expect(humanizeAction('fetch_url')).toBe('Fetch URL');
  });

  it('reads camelCase as well as snake_case', () => {
    expect(humanizeAction('createService')).toBe('Create service');
    expect(humanizeAction('create-service')).toBe('Create service');
  });

  it('leaves nothing to say about nothing', () => {
    expect(humanizeAction('')).toBe('');
    expect(humanizeAction('___')).toBe('');
  });
});

describe('rollUpRunState', () => {
  const roll = (...states: RunState[]) => rollUpRunState(states);

  it('lets a failure outrank everything — a hidden failed step is the bug', () => {
    expect(roll('done', 'done', 'failed')).toBe('failed');
    expect(roll('running', 'failed')).toBe('failed');
    expect(roll('skipped', 'failed')).toBe('failed');
  });

  it('is still running while any step is', () => {
    expect(roll('done', 'running')).toBe('running');
    expect(roll('skipped', 'running')).toBe('running');
  });

  it('does not claim success for a run where nothing happened', () => {
    expect(roll()).toBe('skipped');
    expect(roll('skipped', 'skipped')).toBe('skipped');
  });

  it('is done only when every step finished', () => {
    expect(roll('done')).toBe('done');
    expect(roll('done', 'done', 'skipped')).toBe('done');
  });
});

describe('formatRunDuration', () => {
  it('keeps milliseconds under a second, because "0.0s" is not a duration', () => {
    expect(formatRunDuration(0)).toBe('0ms');
    expect(formatRunDuration(42)).toBe('42ms');
    expect(formatRunDuration(999)).toBe('999ms');
  });

  it('keeps one decimal of a second — 6.2s and 6.8s are different to the person waiting', () => {
    expect(formatRunDuration(1000)).toBe('1.0s');
    expect(formatRunDuration(6200)).toBe('6.2s');
    expect(formatRunDuration(59_400)).toBe('59.4s');
  });

  it('drops the decimal past a minute', () => {
    expect(formatRunDuration(60_000)).toBe('1m 00s');
    expect(formatRunDuration(64_000)).toBe('1m 04s');
    expect(formatRunDuration(605_000)).toBe('10m 05s');
  });

  it('never prints sixty seconds', () => {
    expect(formatRunDuration(119_600)).toBe('2m 00s');
  });

  it('says nothing rather than something wrong', () => {
    expect(formatRunDuration(Number.NaN)).toBe('');
    expect(formatRunDuration(-1)).toBe('');
  });
});

describe('formatRunSummary', () => {
  it('is the line a collapsed group shows', () => {
    expect(formatRunSummary(4, 6200)).toBe('4 steps · 6.2s');
    expect(formatRunSummary(1, 800)).toBe('1 step · 800ms');
  });

  it('drops the elapsed half when there is none', () => {
    expect(formatRunSummary(3)).toBe('3 steps');
    expect(formatRunSummary(3, Number.NaN)).toBe('3 steps');
  });

  it('takes a duration a caller already formatted', () => {
    expect(formatRunSummary(2, 'about a minute')).toBe('2 steps · about a minute');
  });
});
