import { useMemo } from 'react';
import { useCatalog } from '../KnowledgeBaseCatalogContext';
import { useKnowledge } from '../KnowledgeBaseStoreContext';
import { selectProducts, selectServices } from '../lib/catalogStore';
import { bySeverity, lint, type Finding } from '../lib/lint';

/**
 * Every finding in this knowledge base, worst first.
 *
 * The workspace filters this per source before it hands a page its
 * `props.findings`, which is right for a source page and useless for the
 * Overview — the Overview's whole job is the list nobody has filtered. Rather
 * than pass the full list down a frozen view contract, both callers derive it
 * from the same two stores through here, so there is exactly one description
 * of what "the findings" are.
 */
export function useLint(): readonly Finding[] {
  const store = useKnowledge();
  const catalog = useCatalog();

  const products = useMemo(() => selectProducts(catalog.state), [catalog.state]);
  const services = useMemo(() => selectServices(catalog.state), [catalog.state]);

  return useMemo(
    () =>
      bySeverity(
        lint({
          kb: store.state.kb,
          faqs: store.state.faqs,
          products,
          services,
          specialists: catalog.state.specialists,
          catalogReady: catalog.state.ready,
        }),
      ),
    [store.state.kb, store.state.faqs, products, services, catalog.state.specialists, catalog.state.ready],
  );
}
