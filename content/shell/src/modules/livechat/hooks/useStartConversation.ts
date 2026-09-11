import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '~ui';
import { CreateConversationDocument } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { startFailureText } from '../lib/startConversation';

/**
 * Start (or find) a conversation by contact id, and consume the
 * `?contact=<id>` deep link at mount through the same path.
 *
 * Nothing is checked in front of the mutation. The permission is the server's
 * to enforce and a role gate cannot tell a denial from a lookup that failed, so
 * a refusal is read off the answer instead — `startFailureText` in
 * `lib/startConversation.ts` is the rule, and both entry points use it.
 */
export function useStartConversation(
  select: (id: string) => void,
  refetchList: () => void,
  startWithContact: string | null,
  closeNewConversation: () => void,
): (contactId: string) => Promise<void> {
  const { client } = useLivechat();
  const toast = useToast();

  /* `CreateConversation` is "ensure a conversation exists": for a contact who
     already has one it answers theirs, so this doubles as "open by contact
     id". The thread opens now, by id, the way a deep link does. The list is
     asked again rather than patched: a brand-new row needs a name and a
     preview, which three fields of a Conversation cannot supply, and the
     answer says nothing about whether the contact matches the current filter.
     The server's own Add, when it comes, finds the row already there. */
  const createConversation = useCallback(
    async (contactId: string) => {
      const data = await client.mutate(CreateConversationDocument, { contactID: contactId });
      const created = data.conversationCreate;
      if (!created) throw new Error('The server answered with no conversation.');
      select(created.id);
      refetchList();
      closeNewConversation();
    },
    [client, select, refetchList, closeNewConversation],
  );

  const consumed = useRef(false);
  useEffect(() => {
    if (!startWithContact || consumed.current) return;
    consumed.current = true;
    createConversation(startWithContact).catch((err: unknown) =>
      toast.show({
        tone: 'danger',
        title: 'Could not open a conversation for that contact',
        description: startFailureText(err),
      }),
    );
    // Once, at mount: the param is an instruction and has already been
    // consumed. Nothing here waits on an answer it has to read first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWithContact]);

  return createConversation;
}
