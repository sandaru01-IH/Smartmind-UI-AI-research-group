'use client';

import { useId, useMemo, useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { quickAddMemberAction } from '@/app/admin/team-actions';
import { buttonClass } from '@/components/ui/button';
import { useToast } from './toast';

export interface PersonOption {
  id: string;
  name: string;
  group_label: string;
}

/**
 * Pick the people a piece of work belongs to. Whoever is ticked gets the work on their profile, and
 * people who share work are connected on the team page automatically.
 */
export function PeoplePicker({
  options: given,
  value,
  onChange,
  label = 'People involved',
}: {
  options: PersonOption[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const id = useId();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [added, setAdded] = useState<PersonOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', role: '', group_label: '' });
  const [busy, setBusy] = useState(false);
  const options = useMemo(
    () => [...given, ...added.filter((a) => !given.some((g) => g.id === a.id))],
    [given, added],
  );
  const chosen = useMemo(() => new Set(value), [value]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.name.toLowerCase().includes(needle)) : options;
  }, [options, q]);

  const toggle = (pid: string) =>
    onChange(chosen.has(pid) ? value.filter((v) => v !== pid) : [...value, pid]);

  async function create() {
    setBusy(true);
    const res = await quickAddMemberAction(draft);
    setBusy(false);
    if (!res.ok) return toast.push(res.message, 'error');
    setAdded((a) => [...a, res.data]);
    onChange([...value, res.data.id]);
    setDraft({ name: '', role: '', group_label: '' });
    setAdding(false);
    toast.push(`${res.data.name} added to the team and linked here.`);
  }

  // Enter adds the person; it must not submit the post or award form around the picker.
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!busy && draft.name.trim().length >= 2) void create();
  };

  const inputClass =
    'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';

  return (
    <div>
      <p className="label-mono mb-2 text-muted">
        {label} <span className="text-fg">({value.length})</span>
      </p>
      {value.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Linked people">
          {value.map((pid) => (
            <li
              key={pid}
              className="inline-flex items-center gap-1 rounded-sharp border border-line-strong bg-surface-2 py-1 pl-3 pr-1 text-[0.9rem]"
            >
              {byId.get(pid)?.name ?? 'Unknown person'}
              <button
                type="button"
                onClick={() => toggle(pid)}
                aria-label={`Remove ${byId.get(pid)?.name ?? 'person'}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-sharp text-muted hover:text-fg"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        type="search"
        aria-label="Find a person"
        placeholder="Find a person"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted"
      />
      <ul
        className="mt-2 max-h-52 overflow-y-auto border border-line"
        aria-label="People"
        id={`${id}-list`}
      >
        {shown.length === 0 ? (
          <li className="p-3 text-muted">
            {options.length === 0 ? 'No one on the team yet.' : 'No one matches.'}
          </li>
        ) : null}
        {shown.map((o) => (
          <li key={o.id} className="border-b border-line last:border-b-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3">
              <input
                type="checkbox"
                checked={chosen.has(o.id)}
                onChange={() => toggle(o.id)}
                className="h-5 w-5 shrink-0 accent-[var(--signal)]"
              />
              <span className="min-w-0 flex-1 truncate">{o.name}</span>
              {o.group_label ? (
                <span className="label-mono hidden text-muted sm:block">{o.group_label}</span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="mt-3 space-y-3 border border-line-strong p-3">
          <p className="label-mono text-muted">New person</p>
          <input
            aria-label="Name"
            placeholder="Full name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            className={inputClass}
            onKeyDown={onEnter}
          />
          <input
            aria-label="Role"
            placeholder="Role (optional)"
            value={draft.role}
            onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
            className={inputClass}
            onKeyDown={onEnter}
          />
          <input
            aria-label="Group"
            placeholder="Group, such as Core or Collaborator (optional)"
            value={draft.group_label}
            onChange={(e) => setDraft((d) => ({ ...d, group_label: e.target.value }))}
            className={inputClass}
            onKeyDown={onEnter}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || draft.name.trim().length < 2}
              onClick={() => void create()}
              className={buttonClass('primary', '', 'sm')}
            >
              {busy ? (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              ) : (
                <UserPlus size={16} aria-hidden="true" />
              )}
              Add to team and link
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className={buttonClass('ghost', '', 'sm')}
            >
              Cancel
            </button>
          </div>
          <p className="text-[0.9rem] text-muted">
            They appear on the team map straight away, connected to everyone else linked to this
            work. Add a photo, education and social links later on the Team page.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft((d) => ({ ...d, name: q.trim() }));
            setAdding(true);
          }}
          className={`${buttonClass('secondary', '', 'sm')} mt-3`}
        >
          <UserPlus size={16} aria-hidden="true" /> Add a new person
        </button>
      )}
    </div>
  );
}
