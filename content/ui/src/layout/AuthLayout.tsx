import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  /** The h1. A string, because a sign-in page has exactly one heading and it is text. */
  title: string;
  /** Muted line under the title: "Enter the code we sent to…", "Welcome back". */
  subtitle?: ReactNode;
  /** Logo / product mark, on its own row above the title. */
  brand?: ReactNode;
  /** Pinned to the top-right corner of the page: a theme toggle, a language picker, "Need help?". */
  topRight?: ReactNode;
  /** Under the card: "Don't have an account? Sign up", legal links, a version. */
  footer?: ReactNode;
  /**
   * The column's measure. `sm` (26rem) is a sign-in, a reset, a code — one
   * field or two. `md` (32rem) is a sign-up or an invite acceptance, where a
   * name, an email, a password and a checkbox have to breathe.
   */
  width?: 'sm' | 'md';
  /**
   * Own the viewport height (`h-dvh`) or fill the host's box (`h-full`).
   * Default true — the auth pages are the one place the app has no shell
   * around them. `h-dvh` rather than `h-screen` for the same reason as
   * AppShell: mobile Safari's `100vh` ignores its own address bar.
   */
  fill?: boolean;
  children: ReactNode;
  className?: string;
}

const WIDTH_CLASSES: Record<NonNullable<AuthLayoutProps['width']>, string> = {
  sm: 'max-w-auth',
  md: 'max-w-auth-wide',
};

/**
 * The centred column every unauthenticated page is built on: sign in, sign up,
 * forgot / reset password, verify email, accept invite.
 *
 * It is its own `@container`, and the card is a container-width decision, not
 * a viewport one: from 28rem of container up the column sits in a raised card
 * (surface, border, radius, shadow, padding); below that the card would be a
 * box drawn a few pixels inside another box, so it goes flat and the page
 * gutter is the only inset. The same component therefore reads right at 360px
 * on a phone, in a 400px-wide embed and on a 1440px desktop, without knowing
 * which one it is in.
 *
 * Vertically it centres in the space it has and scrolls when it does not — a
 * sign-up form on a short landscape phone still reaches its button.
 */
export function AuthLayout({
  title,
  subtitle,
  brand,
  topRight,
  footer,
  width = 'sm',
  fill = true,
  children,
  className = '',
}: AuthLayoutProps) {
  const measure = WIDTH_CLASSES[width];
  return (
    <div
      className={`@container ${
        fill ? 'h-dvh' : 'h-full min-h-0'
      } w-full overflow-y-auto bg-surface font-sans text-text ${className}`}
    >
      <div className="relative flex min-h-full flex-col items-center justify-center px-gutter py-gutter-loose">
        {topRight !== undefined ? (
          <div className="absolute right-gutter top-gutter flex items-center gap-2">{topRight}</div>
        ) : null}

        <div
          className={`w-full ${measure} @min-[28rem]:rounded-card @min-[28rem]:border @min-[28rem]:border-border @min-[28rem]:bg-surface-raised @min-[28rem]:p-6 @min-[28rem]:shadow-raised`}
        >
          {brand !== undefined ? <div className="mb-6 flex items-center gap-2">{brand}</div> : null}
          <h1 className="text-title font-semibold text-text">{title}</h1>
          {subtitle !== undefined ? <p className="mt-1 text-sm text-text-muted">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer !== undefined ? (
          <div
            className={`mt-6 flex w-full ${measure} flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-meta text-text-muted`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
