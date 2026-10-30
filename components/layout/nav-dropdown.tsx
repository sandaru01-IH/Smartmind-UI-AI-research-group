'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink, RouteChange } from './nav-link';
import type { NavGroup } from './nav-items';

/**
 * A top-bar item that opens a menu of pages. Opens on hover (mouse only), click or tap, and the
 * arrow keys. Closes on Escape, a click outside, focus leaving, or a route change. The menu stays in
 * the DOM while closed so a child that is the current page can still mark the button as current.
 */
export function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const openedByHover = useRef(false);
  const menuId = useId();

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    openedByHover.current = false;
    if (returnFocus) button.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const links = () => Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('ul a') ?? []);

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => links()[0]?.focus());
    }
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const items = links();
    const at = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(at + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(at - 1 + items.length) % items.length]?.focus();
    }
  };

  return (
    <li
      ref={root}
      className="group relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        openedByHover.current = true;
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close(true);
        }
      }}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <RouteChange onChange={() => close()} />
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onKeyDown={onButtonKey}
        onClick={() => {
          if (openedByHover.current) {
            // The pointer already opened it on the way in; this click should keep it open.
            openedByHover.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        className="relative inline-flex min-h-11 items-center gap-1 whitespace-nowrap px-2.5 text-[0.95rem] text-muted transition-colors hover:text-fg group-has-[[aria-current=page]]:text-fg"
      >
        {group.label}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-2.5 bottom-1.5 hidden h-px bg-signal group-has-[[aria-current=page]]:block"
        />
      </button>
      <ul
        id={menuId}
        hidden={!open}
        aria-label={group.label}
        onKeyDown={onMenuKey}
        className="absolute left-0 top-full z-50 min-w-48 border border-line-strong bg-bg py-1 shadow-lg"
      >
        {group.children.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              className="flex min-h-11 items-center px-4 text-[0.95rem] text-muted hover:bg-surface-2 hover:text-fg aria-[current=page]:text-fg"
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  );
}
