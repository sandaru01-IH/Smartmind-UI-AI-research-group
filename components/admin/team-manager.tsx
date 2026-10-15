'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Link2, Loader2, Plus, Save, Trash2, Unlink, Users } from 'lucide-react';
import {
  addLinkAction,
  deleteLinkAction,
  deleteMemberAction,
  importStarterTeamAction,
  saveMemberAction,
  updateLinkAction,
} from '@/app/admin/team-actions';
import { buttonClass } from '@/components/ui/button';
import { slugify } from '@/lib/slug';
import { teamMemberSchema } from '@/lib/team/schema';
import type { TeamLink, TeamMember } from '@/lib/team/types';
import { ImageUploader } from './image-uploader';
import { useToast } from './toast';

const field =
  'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';
const area =
  'w-full rounded-sharp border border-line-strong bg-surface p-3 text-base text-fg placeholder:text-muted';

interface Draft {
  slug: string;
  name: string;
  role: string;
  group_label: string;
  affiliation: string;
  education: string;
  qualifications: string;
  papers: string;
  contribution: string;
  photo_path: string | null;
  photo_alt: string;
  profile_url: string;
  visible: boolean;
  sort_order: string;
}

const blank = (): Draft => ({
  slug: '',
  name: '',
  role: '',
  group_label: '',
  affiliation: '',
  education: '',
  qualifications: '',
  papers: '',
  contribution: '',
  photo_path: null,
  photo_alt: '',
  profile_url: '',
  visible: true,
  sort_order: '0',
});

const fromMember = (m: TeamMember): Draft => ({
  slug: m.slug,
  name: m.name,
  role: m.role,
  group_label: m.group_label,
  affiliation: m.affiliation,
  education: m.education,
  qualifications: m.qualifications,
  papers: m.papers === null ? '' : String(m.papers),
  contribution: m.contribution,
  photo_path: m.photo_path,
  photo_alt: m.photo_alt ?? '',
  profile_url: m.profile_url ?? '',
  visible: m.visible,
  sort_order: String(m.sort_order),
});

const toValues = (d: Draft) => ({
  ...d,
  papers: d.papers.trim() === '' ? null : Number(d.papers),
  sort_order: Number(d.sort_order || 0),
  profile_url: d.profile_url.trim() || null,
});

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-2 block text-muted">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[0.9rem] text-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-[0.9rem] text-danger">{error}</p> : null}
    </div>
  );
}

function MemberForm({
  member,
  onDone,
}: {
  member: TeamMember | null;
  onDone: (saved: TeamMember | null) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [d, setD] = useState<Draft>(member ? fromMember(member) : blank());
  const [slugTouched, setSlugTouched] = useState(Boolean(member));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, start] = useTransition();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((p) => {
      const next = { ...p, [k]: v };
      if (k === 'name' && !slugTouched) next.slug = slugify(String(v)).slice(0, 80);
      return next;
    });
  const err = (k: string) => errors[k]?.[0];
  const valid = teamMemberSchema.safeParse(toValues(d)).success;

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveMemberAction({ id: member?.id ?? null, values: toValues(d) });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.push(res.message, 'error');
        return;
      }
      toast.push('Saved. The team page is updated.');
      router.refresh();
      onDone(res.data);
    });
  }

  function remove() {
    if (!member || !window.confirm(`Remove ${member.name} and their connections for good?`)) return;
    start(async () => {
      const res = await deleteMemberAction(member.id);
      if (!res.ok) return toast.push(res.message, 'error');
      toast.push('Removed.');
      router.refresh();
      onDone(null);
    });
  }

  return (
    <form onSubmit={save} noValidate className="space-y-5 border border-line-strong p-5">
      <h3 className="text-xl">{member ? `Edit ${member.name}` : 'Add a person'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tm-name" label="Name" error={err('name')}>
          <input
            id="tm-name"
            value={d.name}
            onChange={(e) => set('name', e.target.value)}
            className={field}
            required
          />
        </Field>
        <Field id="tm-slug" label="Slug" error={err('slug')}>
          <input
            id="tm-slug"
            value={d.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set('slug', e.target.value.toLowerCase());
            }}
            className={`${field} font-mono`}
            spellCheck={false}
          />
        </Field>
        <Field id="tm-role" label="Role / title" error={err('role')}>
          <input
            id="tm-role"
            value={d.role}
            onChange={(e) => set('role', e.target.value)}
            className={field}
          />
        </Field>
        <Field
          id="tm-group"
          label="Group label"
          hint="Free text, such as Core, Alumni or Collaborator. People with the same label share a colour."
          error={err('group_label')}
        >
          <input
            id="tm-group"
            value={d.group_label}
            onChange={(e) => set('group_label', e.target.value)}
            className={field}
          />
        </Field>
        <Field id="tm-aff" label="Affiliation" error={err('affiliation')}>
          <input
            id="tm-aff"
            value={d.affiliation}
            onChange={(e) => set('affiliation', e.target.value)}
            className={field}
          />
        </Field>
        <Field id="tm-papers" label="Number of papers" error={err('papers')}>
          <input
            id="tm-papers"
            inputMode="numeric"
            value={d.papers}
            onChange={(e) => set('papers', e.target.value.replace(/[^\d]/g, ''))}
            className={field}
          />
        </Field>
      </div>
      <Field id="tm-edu" label="Education" error={err('education')}>
        <textarea
          id="tm-edu"
          rows={2}
          value={d.education}
          onChange={(e) => set('education', e.target.value)}
          className={area}
        />
      </Field>
      <Field id="tm-qual" label="Qualifications" error={err('qualifications')}>
        <textarea
          id="tm-qual"
          rows={2}
          value={d.qualifications}
          onChange={(e) => set('qualifications', e.target.value)}
          className={area}
        />
      </Field>
      <Field id="tm-contrib" label="Key contribution to the domain" error={err('contribution')}>
        <textarea
          id="tm-contrib"
          rows={3}
          value={d.contribution}
          onChange={(e) => set('contribution', e.target.value)}
          className={area}
        />
      </Field>
      <Field id="tm-url" label="Profile link (optional)" error={err('profile_url')}>
        <input
          id="tm-url"
          type="url"
          placeholder="https://"
          value={d.profile_url}
          onChange={(e) => set('profile_url', e.target.value)}
          className={field}
        />
      </Field>
      <div>
        <p className="label-mono mb-2 text-muted">Photo (optional)</p>
        <ImageUploader
          name="photo"
          noun="photo"
          value={{ path: d.photo_path, alt: d.photo_alt }}
          onChange={(v) => setD((p) => ({ ...p, photo_path: v.path, photo_alt: v.alt }))}
          onError={(m) => toast.push(m, 'error')}
          altError={err('photo_alt')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="tm-sort"
          label="Order"
          hint="Lower numbers come first in the roster and the layout."
          error={err('sort_order')}
        >
          <input
            id="tm-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', e.target.value.replace(/[^\d-]/g, ''))}
            className={field}
          />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end">
          <input
            type="checkbox"
            checked={d.visible}
            onChange={(e) => set('visible', e.target.checked)}
            className="h-5 w-5 accent-[var(--signal)]"
          />
          <span>Show on the public team page</span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !valid} className={buttonClass('primary')}>
          {busy ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          Save
        </button>
        <button type="button" onClick={() => onDone(null)} className={buttonClass('ghost')}>
          Cancel
        </button>
        {member ? (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className={buttonClass('danger', 'ml-auto')}
          >
            <Trash2 size={16} aria-hidden="true" /> Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Connections({ members, links }: { members: TeamMember[]; links: TeamLink[] }) {
  const toast = useToast();
  const router = useRouter();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [label, setLabel] = useState('');
  const [busy, start] = useTransition();
  const name = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addLinkAction({ a, b, label });
      if (!res.ok) return toast.push(res.message, 'error');
      toast.push('Connected.');
      setB('');
      setLabel('');
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="links-h" className="space-y-5">
      <div>
        <h2 id="links-h" className="flex items-center gap-2 text-2xl">
          <Link2 size={20} aria-hidden="true" /> Connections
        </h2>
        <p className="mt-1 text-muted">
          Each connection becomes a line in the team network. The label shows when a visitor hovers
          or selects either person.
        </p>
      </div>
      <form onSubmit={add} className="grid gap-3 border border-line p-4 md:grid-cols-12">
        <div className="md:col-span-3">
          <label htmlFor="ln-a" className="label-mono mb-2 block text-muted">
            Person
          </label>
          <select id="ln-a" value={a} onChange={(e) => setA(e.target.value)} className={field}>
            <option value="">Choose…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <label htmlFor="ln-b" className="label-mono mb-2 block text-muted">
            Connected to
          </label>
          <select id="ln-b" value={b} onChange={(e) => setB(e.target.value)} className={field}>
            <option value="">Choose…</option>
            {members
              .filter((m) => m.id !== a)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </div>
        <div className="md:col-span-4">
          <label htmlFor="ln-l" className="label-mono mb-2 block text-muted">
            Label (optional)
          </label>
          <input
            id="ln-l"
            value={label}
            maxLength={80}
            placeholder="Co-authors, supervisor, same project…"
            onChange={(e) => setLabel(e.target.value)}
            className={field}
          />
        </div>
        <div className="flex items-end md:col-span-2">
          <button
            type="submit"
            disabled={busy || !a || !b}
            className={buttonClass('primary', 'w-full')}
          >
            <Plus size={16} aria-hidden="true" /> Connect
          </button>
        </div>
      </form>

      {links.length === 0 ? (
        <p className="text-muted">No connections yet.</p>
      ) : (
        <ul className="divide-y divide-line border border-line">
          {links.map((l) => (
            <LinkRow key={`${l.id}-${l.label}`} link={l} a={name.get(l.a)} b={name.get(l.b)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LinkRow({ link, a, b }: { link: TeamLink; a?: string; b?: string }) {
  const toast = useToast();
  const router = useRouter();
  const [label, setLabel] = useState(link.label);
  const [busy, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <p className="min-w-0 flex-1 basis-56">
        <span className="font-semibold">{a ?? 'Unknown'}</span>
        <span className="text-muted"> ↔ </span>
        <span className="font-semibold">{b ?? 'Unknown'}</span>
      </p>
      <input
        aria-label={`Label for ${a} and ${b}`}
        value={label}
        maxLength={80}
        onChange={(e) => setLabel(e.target.value)}
        className={`${field} basis-64 sm:w-64 sm:flex-none`}
      />
      <button
        type="button"
        disabled={busy || label === link.label}
        onClick={() =>
          start(async () => {
            const r = await updateLinkAction(link.id, label);
            if (!r.ok) return toast.push(r.message, 'error');
            toast.push('Label saved.');
            router.refresh();
          })
        }
        className={buttonClass('secondary', '', 'sm')}
      >
        Save
      </button>
      <button
        type="button"
        disabled={busy}
        aria-label={`Disconnect ${a} and ${b}`}
        onClick={() =>
          start(async () => {
            const r = await deleteLinkAction(link.id);
            if (!r.ok) return toast.push(r.message, 'error');
            toast.push('Disconnected.');
            router.refresh();
          })
        }
        className={buttonClass('ghost', '', 'sm')}
      >
        <Unlink size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

export function TeamManager({ members, links }: { members: TeamMember[]; links: TeamLink[] }) {
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<TeamMember | 'new' | null>(null);
  const [busy, start] = useTransition();
  const [filter, setFilter] = useState('');
  const shown = members.filter((m) =>
    `${m.name} ${m.role} ${m.group_label}`.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const l of links) {
      d.set(l.a, (d.get(l.a) ?? 0) + 1);
      d.set(l.b, (d.get(l.b) ?? 0) + 1);
    }
    return d;
  }, [links]);

  return (
    <div className="space-y-12">
      <section aria-labelledby="people-h" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="people-h" className="flex items-center gap-2 text-2xl">
            <Users size={20} aria-hidden="true" /> People
          </h2>
          <div className="flex flex-wrap gap-2">
            {members.length === 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const r = await importStarterTeamAction();
                    if (!r.ok) return toast.push(r.message, 'error');
                    toast.push(`Imported ${r.data.members} people and their connections.`);
                    router.refresh();
                  })
                }
                className={buttonClass('secondary')}
              >
                Import the starter team
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing('new')}
              className={buttonClass('primary')}
            >
              <Plus size={16} aria-hidden="true" /> Add person
            </button>
          </div>
        </div>

        {editing ? (
          <MemberForm
            key={editing === 'new' ? 'new' : editing.id}
            member={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : null}

        {members.length > 6 ? (
          <input
            type="search"
            aria-label="Filter people"
            placeholder="Filter by name, role or group"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={field}
          />
        ) : null}

        {members.length === 0 ? (
          <p className="border border-dashed border-line-strong p-5 text-muted">
            No one is on the team page yet. Add a person, or import the sourced starter team.
          </p>
        ) : (
          <ul className="divide-y divide-line border border-line">
            {shown.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold">{m.name}</p>
                  <p className="label-mono text-muted">
                    {[m.group_label || 'No group', `${degree.get(m.id) ?? 0} connections`]
                      .concat(m.visible ? [] : ['Hidden'])
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(m)}
                  className={buttonClass('secondary', '', 'sm')}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {members.length > 1 ? <Connections members={members} links={links} /> : null}
    </div>
  );
}
