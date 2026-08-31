/**
 * Records for tests, written out rather than fetched.
 *
 * The render smoke suite needs an account to draw the composer and the grids
 * around, and the shape is the whole point: a connected account holding the
 * publish permission is the state every screen past the connect prompt is
 * written against.
 */
import { FileStatus, FileType } from '~api/generated/publishing/graphql';
import type { Account } from '../types';

/** A face-shaped picture, for the avatar: a soft light with nothing behind it. */
const portrait = (hue: number): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">` +
      `<rect width="200" height="200" fill="hsl(${hue} 46% 32%)"/>` +
      `<circle cx="100" cy="78" r="34" fill="hsl(${hue} 40% 78%)"/>` +
      `<path d="M28 200c0-42 32-66 72-66s72 24 72 66Z" fill="hsl(${hue} 40% 78%)"/>` +
      `</svg>`,
  )}`;

export const sampleAccount: Account = {
  __typename: 'InstagramAccount',
  id: 'ig-account-1',
  username: 'demo.account',
  name: 'Demo account',
  biography: 'A connected Instagram account, as the module sees one.',
  website: 'https://example.com',
  permissions: [
    'InstagramBusinessBasic',
    'InstagramBusinessManageMessages',
    'InstagramBusinessManageComments',
    'InstagramBusinessContentPublish',
  ] as Account['permissions'],
  profilePicture: {
    __typename: 'File',
    id: 'file-avatar',
    url: portrait(268),
    type: FileType.Image,
    status: FileStatus.Downloaded,
    size: 240_000,
  },
};
