import type { ReactNode } from 'react';
import type { AppRoute, Navigate } from '../types';
import { AuthProvider } from './AuthProvider';
import { AuthRouter } from './AuthRouter';
import type { SessionLostBus } from './runtime';
import type { AuthAdapter, Membership } from './types';

export interface AuthGateProps {
  adapter: AuthAdapter;
  sessionLost: SessionLostBus;
  route: AppRoute;
  navigate: Navigate;
  appName: string;
  appLogo?: string;
  onWorkspace?: (membership: Membership | null) => void;
  children: ReactNode;
}

/**
 * The module's entry component (module.json embed.entryComponent). Wraps the
 * shell: renders the auth screens while there is no session, the "setting up"
 * state while the account's bot is being created, and its children once the
 * workspace is there. Provider and consumer are different components on
 * purpose (validator pass 10b).
 */
export function AuthGate({
  adapter,
  sessionLost,
  route,
  navigate,
  appName,
  appLogo,
  onWorkspace,
  children,
}: AuthGateProps) {
  return (
    <AuthProvider
      adapter={adapter}
      navigate={navigate}
      sessionLost={sessionLost}
      appName={appName}
      appLogo={appLogo}
      onWorkspace={onWorkspace}
    >
      <AuthRouter route={route}>{children}</AuthRouter>
    </AuthProvider>
  );
}
