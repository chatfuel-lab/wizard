/**
 * TypeScript shape of apps/<id>/app.json in the chatfuel-apps catalog repo.
 * app.schema.json (ajv'd by the catalog repo's own CI) is the authority; this
 * type lives next to a copy of it so the two are reviewed together. The wizard
 * validates fetched manifests with parseAppManifest() rather than ajv — remote
 * input deserves error messages that name the field and the fix.
 */
export interface AppEnvDeclaration {
  name: string;
  default?: string;
  /** May stay empty; written as a commented-out line when it has no value. */
  optional?: boolean;
  // Deliberately narrower than a module's env declaration: no `secret`, no
  // `resolve`, no `prompt` — an app preset must not hook wizard steps or
  // declare secrets of its own.
}

export interface AppManifest {
  /** Equals the app's directory name; doubles as the catalog site's slug. */
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'instagram' | 'whatsapp' | 'facebook' | 'website' | 'other';
  /** The site lists only published apps; the wizard scaffolds drafts too. */
  status: 'draft' | 'published';
  /** Oldest wizard release that understands this app; refused loudly below it. */
  minWizardVersion?: string;
  /** Wizard module ids (what --modules takes), not the site's marketing slugs. */
  modules: string[];
  brand: {
    appName: string;
    /** App-dir-relative path, e.g. listing/icon.png. */
    logo?: string;
  };
  env?: AppEnvDeclaration[];
  npmDependencies?: Record<string, string>;
  /** App-dir-relative path to the agent build plan (default playbook.md). */
  playbook?: string;
  listing: {
    icon: string;
    screenshots: Array<{ file: string; alt: string }>;
    keywords?: string[];
  };
}
