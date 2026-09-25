import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommentPreview, type CommentPreviewProps } from './CommentPreview';

/* The comment test from frozen props: each step of an attempt, and what it
   shows and hides. */
const props = (over: Partial<CommentPreviewProps> = {}): CommentPreviewProps => ({
  platform: 'instagram',
  accountName: '@luma.skin',
  post: { postId: 'p1', text: 'New serum is in', imageUrl: 'https://cdn.example/p1.jpg', loading: false },
  ready: true,
  starting: false,
  startError: null,
  onStart: () => undefined,
  comment: null,
  publicReply: null,
  sendsDirectMessage: true,
  directMessageArrived: false,
  onSend: () => undefined,
  onTestDMs: () => undefined,
  ...over,
});

const draw = (over: Partial<CommentPreviewProps> = {}) => renderToStaticMarkup(<CommentPreview {...props(over)} />);

describe('CommentPreview', () => {
  it('offers Start before there is a session', () => {
    const html = draw({ ready: false });
    expect(html).toContain('Leave a test comment');
    expect(html).toContain('Start');
    expect(html).not.toContain('Add a comment');
  });

  it('says why a start was refused and offers another try', () => {
    const html = draw({ ready: false, startError: 'This automation no longer exists — reload the page.' });
    expect(html).toContain('The test could not start');
    expect(html).toContain('Try again');
  });

  it('draws the post and a comment field', () => {
    const html = draw();
    expect(html).toContain('@luma.skin');
    expect(html).toContain('New serum is in');
    expect(html).toContain('https://cdn.example/p1.jpg');
    expect(html).toContain('Add a comment');
  });

  it('draws a placeholder for an automation that watches every post', () => {
    const html = draw({ post: { postId: null, text: '', imageUrl: null, loading: false } });
    expect(html).toContain('Any post');
  });

  it('waits for the reply once the comment is sent, with no second field', () => {
    const html = draw({ comment: { text: 'price?', sending: false, error: null } });
    expect(html).toContain('price?');
    expect(html).toContain('Waiting for the reply');
    expect(html).not.toContain('Add a comment');
    expect(html).not.toContain('Test DMs');
  });

  it('nests the public reply under the comment and offers Test DMs', () => {
    const html = draw({ comment: { text: 'price?', sending: false, error: null }, publicReply: 'Sent you a DM!' });
    expect(html).toContain('Sent you a DM!');
    expect(html).not.toContain('Waiting for the reply');
    expect(html).toContain('AI agent sent a direct message');
    expect(html).toContain('Test DMs');
  });

  it('offers no Test DMs when the automation does not answer in the DM', () => {
    const html = draw({
      comment: { text: 'price?', sending: false, error: null },
      publicReply: 'Thanks!',
      sendsDirectMessage: false,
    });
    expect(html).not.toContain('Test DMs');
  });

  it('shows why a comment was refused', () => {
    const html = draw({ comment: { text: 'price?', sending: false, error: 'boom' } });
    expect(html).toContain('boom');
    expect(html).not.toContain('Waiting for the reply');
  });
});
