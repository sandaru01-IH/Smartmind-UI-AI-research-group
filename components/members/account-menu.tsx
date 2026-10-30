'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { memberLogoutAction } from '@/app/members-actions';
import { RouteChange } from '@/components/layout/nav-link';
import { t } from '@/content/strings';

interface Me {
  signedIn: boolean;
  name?: string;
  photoUrl?: string | null;
  canPost?: boolean;
}

/**
 * Asks the server who is signed in, and asks again after every page change (logging in or out moves
 * the page, but the header stays mounted). Render `watcher` once next to the component using it.
 */
function useMe(): {
  me: Me | undefined;
  watcher: ReactNode;
  signOutLocally: () => void;
} {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (tick === 0) return; // The first call comes from the watcher as soon as it mounts.
    let live = true;
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : { signedIn: false }))
      .then((m) => live && setMe(m))
      .catch(() => live && setMe({ signedIn: false }));
    return () => {
      live = false;
    };
  }, [tick]);
  return {
    me,
    watcher: <RouteChange onChange={() => setTick((n) => n + 1)} />,
    signOutLocally: () => setMe({ signedIn: false }),
  };
}

const linkClass =
  'flex min-h-11 w-full items-center px-4 text-[0.95rem] text-muted hover:bg-surface-2 hover:text-fg';

function Avatar({ me }: { me: Me }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-xs text-muted">
      {me.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        (me.name ?? '?').slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/** Header control: Log in and Register when signed out, a small menu when signed in. */
export function AccountMenu() {
  const { me, watcher, signOutLocally } = useMe();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Hold the space while the answer loads so the header does not jump.
  if (!me)
    return (
      <>
        {watcher}
        <div className="hidden h-11 w-40 md:block" aria-hidden="true" />
      </>
    );

  if (!me.signedIn) {
    return (
      <div className="hidden items-center gap-1 md:flex">
        {watcher}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center px-3 text-[0.95rem] text-muted hover:text-fg"
        >
          {t.members.login}
        </Link>
        <Link
          href="/register"
          className="inline-flex min-h-11 items-center px-3 text-[0.95rem] text-muted hover:text-fg"
        >
          {t.members.register}
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={root}
      className="relative hidden md:block"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {watcher}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t.members.accountMenu}: ${me.name}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 px-2 text-[0.95rem] text-muted hover:text-fg"
      >
        <Avatar me={me} />
        <span className="max-w-[10ch] truncate">{me.name}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <ul
        id={menuId}
        hidden={!open}
        className="absolute right-0 top-full z-50 min-w-44 border border-line-strong bg-bg py-1 shadow-lg"
      >
        <li>
          <Link href="/write" className={linkClass} onClick={() => setOpen(false)}>
            {t.members.write}
          </Link>
        </li>
        <li>
          <Link href="/account/posts" className={linkClass} onClick={() => setOpen(false)}>
            {t.members.myPosts}
          </Link>
        </li>
        <li>
          <Link href="/account" className={linkClass} onClick={() => setOpen(false)}>
            {t.members.account}
          </Link>
        </li>
        <li>
          <form action={memberLogoutAction} onSubmit={signOutLocally}>
            <button type="submit" className={`${linkClass} text-left`}>
              {t.members.logout}
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}

/** The same links inside the mobile menu. */
export function MobileAccountLinks() {
  const { me, watcher, signOutLocally } = useMe();
  if (!me) return watcher;
  const item =
    'flex min-h-12 items-center text-xl text-muted aria-[current=page]:text-fg hover:text-fg';
  return (
    <ul aria-label={t.members.accountMenu} className="mt-6 space-y-1 border-t border-line pt-6">
      {watcher}
      {me.signedIn ? (
        <>
          <li>
            <Link href="/write" className={item}>
              {t.members.write}
            </Link>
          </li>
          <li>
            <Link href="/account/posts" className={item}>
              {t.members.myPosts}
            </Link>
          </li>
          <li>
            <Link href="/account" className={item}>
              {t.members.account}
            </Link>
          </li>
          <li>
            <form action={memberLogoutAction} onSubmit={signOutLocally}>
              <button type="submit" className={`${item} w-full text-left`}>
                {t.members.logout}
              </button>
            </form>
          </li>
        </>
      ) : (
        <>
          <li>
            <Link href="/login" className={item}>
              {t.members.login}
            </Link>
          </li>
          <li>
            <Link href="/register" className={item}>
              {t.members.register}
            </Link>
          </li>
        </>
      )}
    </ul>
  );
}
