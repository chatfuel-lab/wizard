import { createContext, useContext } from 'react';
import type { PostsStore } from './hooks/usePostsStore';

/**
 * The one list of posts, shared by the calendar and the queue.
 *
 * A provider rather than a prop on the frozen view contract, for the same reason
 * the client is: two views drawing the same rows must draw the SAME rows, and
 * threading a store through props invites a third view to fetch its own.
 */
export const PublishingQueueContext = createContext<PostsStore | null>(null);

export function usePostsQueue(): PostsStore {
  const value = useContext(PublishingQueueContext);
  if (!value) throw new Error('usePostsQueue must be used inside PublishingApp');
  return value;
}
