/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHATFUEL_WORKSPACE_ID?: string;
  readonly VITE_CHATFUEL_DASHBOARD_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_LOGO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
