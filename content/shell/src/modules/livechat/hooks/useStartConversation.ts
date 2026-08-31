import { useCallback, useEffect } from 'react';
import { useToast } from '~ui';
import { CreateConversationDocument } from '~api/generated/livechat/graphql';
import { useLivechat } from '../LivechatContext';
import { messageOf } from '../lib/errors';

/**
 * Start (or find) a conversation by contact id, and consume the
 * `?contact=<id>` deep link at mount through the same path.
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

  useEffect(() => {
    if (!startWithContact) return;
    createConversation(startWithContact).catch((err: unknown) =>
      toast.show({
        tone: 'danger',
        title: 'Could not open a conversation for that contact',
        description: messageOf(err),
      }),
    );
    // Once, at mount: the param is an instruction and has already been consumed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWithContact]);

  return createConversation;
}
