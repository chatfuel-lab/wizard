/**
 * The one page every signed-out screen is: centred column, the app's name at
 * the top, theme toggle in the corner, optional footer under the card.
 *
 * The brand is the DEPLOYMENT's name (`VITE_APP_NAME`, falling back to
 * "Chatfuel App") beside its mark. It used to be the workspace's, back when a
 * deployment served exactly one — now every account gets its own, and a person
 * on the sign-in page has no workspace yet to be named after.
 *
 * With no mark configured the shield stands in, which is also the glyph the
 * shipped default logo draws: an app that was never branded looks the same on
 * this screen as it does in the tab and in the top bar.
 */
import type { ReactNode } from 'react';
import { AuthLayout, IconShield, ThemeToggle } from '~ui';
import { useAuth } from '../AuthContext';

export interface AuthFrameProps {
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  /** `md` for the forms with four fields (sign up, invite acceptance). */
  width?: 'sm' | 'md';
  children: ReactNode;
}

export function AuthFrame({ title, subtitle, footer, width = 'sm', children }: AuthFrameProps) {
  const { appName, appLogo } = useAuth();

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      width={width}
      topRight={<ThemeToggle />}
      footer={footer}
      brand={
        <>
          {appLogo ? (
            <img src={appLogo} alt="" className="size-7 shrink-0 rounded-control object-contain" />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <IconShield size={16} />
            </span>
          )}
          <span className="min-w-0 truncate text-sm font-semibold text-text">{appName}</span>
        </>
      }
    >
      {children}
    </AuthLayout>
  );
}
