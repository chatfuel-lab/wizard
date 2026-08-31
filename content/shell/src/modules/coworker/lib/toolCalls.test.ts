import { describe, expect, it } from 'vitest';
import { APPROVAL, runMessages } from './samples';
import { bareAction, describeTool, effectOf, humanize, isDestructive } from './toolCalls';

describe('humanize', () => {
  it('reads a tool id as a sentence', () => {
    expect(humanize('create_service')).toBe('Create service');
    expect(humanize('list_deals')).toBe('List deals');
  });

  it('keeps the words the product spells in capitals', () => {
    expect(humanize('list_faq')).toBe('List FAQ');
    expect(humanize('ai_setup')).toBe('AI setup');
  });

  it('splits camelCase too — argument keys come through here', () => {
    expect(humanize('durationSeconds')).toBe('Duration seconds');
    expect(humanize('botId')).toBe('Bot ID');
  });

  it('never returns an empty string for a non-empty id', () => {
    expect(humanize('___')).toBe('');
    expect(describeTool('___').title).toBe('___');
  });
});

describe('effectOf', () => {
  it('reads, writes and destroys by the leading verb', () => {
    expect(effectOf('list_catalog')).toBe('read');
    expect(effectOf('get_service')).toBe('read');
    expect(effectOf('create_service')).toBe('write');
    expect(effectOf('update_booking')).toBe('write');
    expect(effectOf('delete_contact')).toBe('destroy');
    expect(effectOf('cancel_booking')).toBe('destroy');
    expect(effectOf('remove_specialist')).toBe('destroy');
  });

  it('treats a verb it does not know as a change, not as a read', () => {
    expect(effectOf('frobnicate_widget')).toBe('write');
  });
});

describe('describeTool', () => {
  it('names an account mutation the way the approval card has to read it', () => {
    expect(describeTool('chatfuel_gql-create_service')).toEqual({
      family: 'data',
      effect: 'write',
      glyph: 'write',
      title: 'Create service',
    });
  });

  it('names a read tool quietly', () => {
    const listed = describeTool('chatfuel_gql-list_catalog');
    expect(listed.title).toBe('List catalog');
    expect(listed.glyph).toBe('read');
  });

  it('names a skill so a person recognises it', () => {
    expect(describeTool('skill-booking_assistant_instr')).toEqual({
      family: 'skill',
      effect: 'read',
      glyph: 'skill',
      title: 'Read its booking assistant instructions',
    });
    expect(describeTool('skill-analytics_instr').title).toBe('Read its analytics instructions');
  });

  it('writes out the built-ins, whose ids are engineering words', () => {
    expect(describeTool('get_frontend_state').title).toBe('Check what is on your screen');
    expect(describeTool('search_help_docs').glyph).toBe('docs');
    expect(describeTool('fetch_url').family).toBe('builtin');
  });

  it('knows the two frontend actions by name', () => {
    expect(describeTool('frontend_action-navigate').title).toBe('Open a page');
    expect(describeTool('frontend_action-suggest_quick_reply').family).toBe('navigation');
  });

  it('falls back to the id itself rather than to nothing', () => {
    const unknown = describeTool('some_new_tool');
    expect(unknown).toEqual({ family: 'unknown', effect: 'write', glyph: 'tool', title: 'Some new tool' });
  });
});

describe('bareAction', () => {
  it('strips whichever family prefix is there', () => {
    expect(bareAction('chatfuel_gql-create_service')).toBe('create_service');
    expect(bareAction('frontend_action-navigate')).toBe('navigate');
    expect(bareAction('skill-analytics_instr')).toBe('analytics_instr');
    expect(bareAction('fetch_url')).toBe('fetch_url');
  });
});

describe('isDestructive', () => {
  it('is what turns the approval card red', () => {
    expect(isDestructive('chatfuel_gql-delete_service')).toBe(true);
    expect(isDestructive('chatfuel_gql-create_service')).toBe(false);
  });
});

describe('over a written-out run', () => {
  it('names every tool the run carries', () => {
    const ids = runMessages()
      .flatMap((msg) => msg.toolCalls as unknown as { __typename: string; toolID?: string }[])
      .filter((call) => call.__typename === 'CoworkerToolOther')
      .map((call) => call.toolID!);
    expect(ids.map((id) => describeTool(id).title)).toEqual([
      'List deals',
      'List contacts',
      'Read its analytics instructions',
    ]);
  });

  it('names the live approval batch', () => {
    expect(APPROVAL.tools.map((tool) => describeTool(tool.toolID).title)).toEqual([
      'Create service',
      'List specialists',
    ]);
  });
});
