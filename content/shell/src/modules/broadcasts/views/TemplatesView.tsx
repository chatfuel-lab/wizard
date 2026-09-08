import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WhatsAppTemplateStatus } from '~api/generated/broadcasts/graphql';
import { Alert, Button, filterItems, openExternal, useToast } from '~ui';
import { useCampaigns, useCatalog } from '../BroadcastsCampaignsContext';
import { NoWhatsApp } from '../components/NoWhatsApp';
import { TemplateDrawer } from '../components/templates/TemplateDrawer';
import { TemplatesTable } from '../components/templates/TemplatesTable';
import { TemplatesToolbar } from '../components/templates/TemplatesToolbar';
import { errorMessage } from '../lib/errors';
import { templateSearchTexts } from '../lib/templatePreview';
import { whatsAppManagerUrl } from '../lib/waManager';
import type { CatalogTemplate } from '../types';
import type { BroadcastsViewProps } from './types';

/**
 * The catalog: every template on the bot's number, with its Meta status. A
 * template is written in WhatsApp Manager and read here; "Use in a campaign"
 * is the one write, and it starts a draft on it.
 */
export function TemplatesView({
  address,
  patch,
  band,
  role,
  bot,
  onBusy,
  onCompose,
  onConnectWhatsApp,
}: BroadcastsViewProps) {
  const catalog = useCatalog();
  const store = useCampaigns();
  const toast = useToast();
  const [status, setStatus] = useState<WhatsAppTemplateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onBusy(catalog.loading);
  }, [catalog.loading, onBusy]);

  const rows = useMemo(() => {
    const byStatus = status ? catalog.templates.filter((template) => template.status === status) : catalog.templates;
    if (!address.q) return byStatus;
    return filterItems(byStatus, address.q, templateSearchTexts).map((match) => match.item);
  }, [catalog.templates, status, address.q]);

  const selected = useMemo(
    () => (address.template ? (catalog.templates.find((template) => template.id === address.template) ?? null) : null),
    [catalog.templates, address.template],
  );

  const managerUrl =
    bot.state === 'ready' && bot.facts.whatsapp
      ? whatsAppManagerUrl(bot.facts.whatsapp.wabaId, bot.facts.whatsapp.businessId)
      : null;

  const checkWithMeta = useCallback(async () => {
    setChecking(true);
    setFailure(null);
    try {
      await catalog.refetchFromMeta();
      toast.show({ title: 'Asked Meta for the latest', tone: 'success', duration: 4000 });
    } catch (err) {
      setFailure(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }, [catalog, toast]);

  const use = useCallback(
    async (template: CatalogTemplate) => {
      setFailure(null);
      try {
        const flowId = await store.createDraft(template.name, 'now', template.id);
        onCompose(flowId, 'message');
      } catch (err) {
        setFailure(errorMessage(err));
      }
    },
    [store, onCompose],
  );

  if (bot.state === 'ready' && bot.facts.whatsapp === null) {
    return <NoWhatsApp onConnect={onConnectWhatsApp} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TemplatesToolbar
        q={address.q}
        onQ={(q) => patch({ q })}
        status={status}
        onStatus={setStatus}
        refreshing={checking || catalog.loading}
        onRefresh={() => void checkWithMeta()}
        managerUrl={managerUrl}
        onOpenManager={() => {
          if (managerUrl) openExternal(managerUrl);
        }}
        searchRef={searchRef}
      />
      {failure ? (
        <div className="px-gutter pt-2">
          <Alert tone="danger" onDismiss={() => setFailure(null)}>
            {failure}
          </Alert>
        </div>
      ) : null}
      {catalog.error && !catalog.loaded ? (
        <div className="p-gutter">
          <Alert
            tone="danger"
            title="The templates could not be read"
            action={
              <Button size="sm" onClick={catalog.refresh}>
                Try again
              </Button>
            }
          >
            {catalog.error}
          </Alert>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <TemplatesTable
            rows={rows}
            selectedId={selected?.id ?? null}
            onOpen={(template) => patch({ template: template.id })}
            loading={catalog.loading && !catalog.loaded}
            compact={band === 'compact'}
          />
        </div>
      )}
      <TemplateDrawer
        template={selected}
        onClose={() => patch({ template: null })}
        onUse={role.canEdit ? (template) => void use(template) : null}
        using={store.isPending('create')}
      />
    </div>
  );
}
