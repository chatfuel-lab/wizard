import { describe, expect, it } from 'vitest';
import { provisionMessage } from './provisionMessage';
import { AuthAdapterError } from '../types';

describe('provisionMessage', () => {
  it('says the deployment is out of room, in the app’s own words', () => {
    // Not the server's sentence: that one is written for the operator reading
    // a log, and it names the plan and the workspace.
    const said = provisionMessage(new AuthAdapterError('WorkspaceFull', 'workspace 6a85… is full'));
    expect(said).toMatch(/cannot take another bot/i);
    expect(said).not.toMatch(/6a85/);
  });

  it('covers a bot cap, which is the operator’s to raise and not a retry', () => {
    expect(provisionMessage(new AuthAdapterError('BotLimitReached', 'This app has reached its bot limit'))).toMatch(
      /no more bots/i,
    );
  });

  it('covers the server that cannot provision at all', () => {
    expect(provisionMessage(new AuthAdapterError('ProvisionUnavailable'))).toMatch(/cannot create bots/i);
  });

  it('keeps the screen’s own wording for anything transient', () => {
    // "Try again in a moment" is true here and a lie for the two above.
    expect(provisionMessage(new AuthAdapterError('Network', 'Could not reach the server'))).toBeUndefined();
    expect(provisionMessage(new AuthAdapterError('Unknown', 'Setting up your workspace failed (503)'))).toBeUndefined();
    expect(provisionMessage(new Error('boom'))).toBeUndefined();
  });
});
