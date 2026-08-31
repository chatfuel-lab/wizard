/**
 * TypeScript shape of modules/<id>/module.json. module.schema.json (ajv'd by
 * scripts/validate.ts and moduleSchema.test.ts) is the authority; this type
 * lives next to it so the two are reviewed together.
 */
export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  status: 'planned' | 'ready';
  /**
   * No nav-rail item and no '/<id>' route — the module wraps or extends the
   * shell instead. Must match `hidden: true` on its shell descriptor.
   */
  hidden?: boolean;
  /** 'opt-in' modules are offered in the picker but never auto-included by --yes. */
  selection?: 'default' | 'opt-in';
  requires?: string[];
  recommends?: string[];
  skill: { installAs: string; dir?: string };
  app?: {
    env?: Array<{
      name: string;
      secret?: boolean;
      default?: string;
      /** May stay empty; written as a commented-out line when it has no value. */
      optional?: boolean;
      /** Which wizard step supplies the value. */
      resolve?: 'authSetup' | 'workspacePick' | 'adminSetup';
      prompt?: string;
    }>;
    embed?: {
      /** Shell-relative embeddable roots, e.g. "src/modules/livechat". */
      roots: string[];
      entryComponent: string;
      npmDependencies?: Record<string, string>;
      playbook?: string;
    };
  };
  permissions?: Array<{ object: string; action: string; requiredFor?: string }>;
}
