'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Download, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteCollabAction,
  deleteFeaturedAction,
  saveCollabAction,
  saveFeaturedAction,
  deleteAwardAction,
  deleteMilestoneAction,
  deletePartnerAction,
  deleteSpotlightAction,
  deletePublicationAction,
  deleteThemeAction,
  importStarterContentAction,
  saveAwardAction,
  saveMilestoneAction,
  savePartnerAction,
  savePublicationAction,
  saveSpotlightAction,
  saveThemeAction,
  saveTopicsAction,
} from '@/app/admin/catalog-actions';
import type { ActionResult } from '@/app/admin/actions';
import { buttonClass } from '@/components/ui/button';
import { TbcFlag } from '@/components/ui/tag';
import {
  collabSchema,
  featuredSchema,
  awardSchema,
  milestoneSchema,
  partnerSchema,
  spotlightSchema,
  publicationSchema,
  themeSchema,
} from '@/lib/catalog/schema';
import {
  PUB_KINDS,
  PUB_KIND_LABEL,
  THEME_STYLES,
  THEME_STYLE_LABEL,
  type Award,
  type CollabProject,
  type FeaturedItem,
  type Milestone,
  type Partner,
  type Publication,
  type ResearchTheme,
  type ResearchTopic,
  type Spotlight,
} from '@/lib/catalog/types';
import { mediaUrl } from '@/lib/supabase/env';
import { areaClass, Check, Field, fieldClass } from './form-bits';
import { ImageUploader } from './image-uploader';
import type { PostWork } from '@/lib/catalog/admin';
import { PeoplePicker, type PersonOption } from './people-picker';
import { useToast } from './toast';

/* ------------------------------------------------------------------ shared */

type Errors = Record<string, string[]>;
const first = (e: Errors, k: string) => e[k]?.[0];

/** The list on the left, the open form on the right (below it on a phone). */
function Workspace<T extends { id: string }>({
  items,
  editing,
  onEdit,
  addLabel,
  empty,
  row,
  form,
}: {
  items: T[];
  editing: string | null;
  onEdit: (id: string | null) => void;
  addLabel: string;
  empty: ReactNode;
  row: (item: T) => ReactNode;
  form: ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <button type="button" onClick={() => onEdit('new')} className={buttonClass('primary')}>
          <Plus size={16} aria-hidden="true" /> {addLabel}
        </button>
        {items.length === 0 ? (
          <div className="mt-4 border border-dashed border-line-strong p-5 text-muted">{empty}</div>
        ) : (
          <ul className="mt-4 border-t border-line">
            {items.map((item) => (
              <li key={item.id} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  aria-current={editing === item.id ? 'true' : undefined}
                  className={`block min-h-11 w-full px-3 py-3 text-left hover:bg-surface-2 ${
                    editing === item.id ? 'bg-surface-2' : ''
                  }`}
                >
                  {row(item)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="lg:col-span-7">
        {form ?? (
          <p className="border border-dashed border-line-strong p-6 text-muted">
            Pick an item to edit it, or add a new one.
          </p>
        )}
      </div>
    </div>
  );
}

function FormFooter({
  busy,
  valid,
  onCancel,
  onDelete,
}: {
  busy: boolean;
  valid: boolean;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={busy || !valid} className={buttonClass('primary')}>
        {busy ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : (
          <Save size={16} aria-hidden="true" />
        )}
        Save
      </button>
      <button type="button" onClick={onCancel} className={buttonClass('ghost')}>
        Cancel
      </button>
      {onDelete ? (
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className={buttonClass('danger', 'ml-auto')}
        >
          <Trash2 size={16} aria-hidden="true" /> Delete
        </button>
      ) : null}
    </div>
  );
}

const numeric = (v: string) => v.replace(/[^\d-]/g, '');
const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
}

const without = <T extends { id: string }>(list: T[], id: string): T[] =>
  list.filter((x) => x.id !== id);

/** Shared save/delete plumbing so each form only describes its fields. */
function useCrud<T extends { id: string }>(initial: T[]) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState<T[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [errors, setErrors] = useState<Errors>({});

  const open = (id: string | null) => {
    setErrors({});
    setEditing(id);
  };

  function save(
    run: () => Promise<ActionResult<T>>,
    done = 'Saved. Every page that uses it is updated.',
  ) {
    start(async () => {
      const res = await run();
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.push(res.message, 'error');
        return;
      }
      const saved = (res as { ok: true; data: T }).data;
      setItems((l) => upsert(l, saved));
      setEditing(saved.id);
      setErrors({});
      toast.push(done);
      router.refresh();
    });
  }

  function remove(id: string, label: string, run: () => Promise<ActionResult>) {
    if (!window.confirm(`Delete ${label} for good? It disappears from the whole site.`)) return;
    start(async () => {
      const res = await run();
      if (!res.ok) return toast.push(res.message, 'error');
      setItems((l) => without(l, id));
      setEditing(null);
      toast.push('Deleted.');
      router.refresh();
    });
  }

  return { items, editing, open, busy, errors, save, remove };
}

const flags = (a: { tbc?: boolean; visible: boolean }) => (
  <span className="mt-1 flex flex-wrap gap-2">
    {a.tbc ? <TbcFlag /> : null}
    {!a.visible ? <span className="label-mono text-muted">Hidden</span> : null}
  </span>
);

/* ------------------------------------------------------------------ awards */

export function AwardsManager({
  awards,
  people,
  linked,
  fromPosts,
}: {
  awards: Award[];
  fromPosts: PostWork[];
  people: PersonOption[];
  /** award id → linked member ids */
  linked: Record<string, string[]>;
}) {
  const crud = useCrud<Award>(awards);
  const [links, setLinks] = useState(linked);
  const current = crud.items.find((a) => a.id === crud.editing) ?? null;

  return (
    <div className="space-y-10">
      <Workspace
        items={crud.items}
        editing={crud.editing}
        onEdit={crud.open}
        addLabel="Add an award"
        empty="No awards yet."
        row={(a) => (
          <>
            <span className="label-mono text-muted">{a.year}</span>
            <span className="block">{a.award}</span>
            {a.who ? <span className="block text-[0.9rem] text-muted">{a.who}</span> : null}
            {flags(a)}
          </>
        )}
        form={
          crud.editing ? (
            <AwardForm
              key={crud.editing}
              award={current}
              people={people}
              linked={links[crud.editing] ?? []}
              crud={crud}
              onLinked={(id, ids) => setLinks((l) => ({ ...l, [id]: ids }))}
            />
          ) : null
        }
      />
      <PostWorks items={fromPosts} noun="awards" />
    </div>
  );
}

function AwardForm({
  award,
  people,
  linked,
  crud,
  onLinked,
}: {
  award: Award | null;
  people: PersonOption[];
  linked: string[];
  crud: ReturnType<typeof useCrud<Award>>;
  onLinked: (id: string, ids: string[]) => void;
}) {
  const [d, setD] = useState({
    year: award ? String(award.year) : String(new Date().getFullYear()),
    when_label: award?.when_label ?? '',
    award: award?.award ?? '',
    who: award?.who ?? '',
    event: award?.event ?? '',
    reason: award?.reason ?? '',
    tbc: award?.tbc ?? false,
    visible: award?.visible ?? true,
    sort_order: String(award?.sort_order ?? 0),
  });
  const [ids, setIds] = useState(linked);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({ ...d, year: num(d.year), sort_order: num(d.sort_order) });
  const valid = awardSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(async () => {
          const res = await saveAwardAction({
            id: award?.id ?? null,
            values: values(),
            people: ids,
          });
          if (res.ok) onLinked(res.data.id, ids);
          return res;
        });
      }}
    >
      <h3 className="text-xl">{award ? 'Edit award' : 'Add an award'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="aw-award" label="Award" error={err('award')}>
          <input
            id="aw-award"
            value={d.award}
            onChange={(e) => set('award', e.target.value)}
            className={fieldClass}
            required
          />
        </Field>
        <Field id="aw-year" label="Year" error={err('year')}>
          <input
            id="aw-year"
            inputMode="numeric"
            value={d.year}
            onChange={(e) => set('year', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <Field id="aw-when" label="Date wording (optional)" hint="For example “May 2025”.">
          <input
            id="aw-when"
            value={d.when_label}
            onChange={(e) => set('when_label', e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field
          id="aw-who"
          label="Awarded to (text)"
          hint="Shown on the card. Link people below to also fill their profiles."
        >
          <input
            id="aw-who"
            value={d.who}
            onChange={(e) => set('who', e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field id="aw-event" label="Event or conference">
        <input
          id="aw-event"
          value={d.event}
          onChange={(e) => set('event', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field id="aw-reason" label="What it was for (optional)">
        <input
          id="aw-reason"
          value={d.reason}
          onChange={(e) => set('reason', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <PeoplePicker options={people} value={ids} onChange={setIds} label="People who won it" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="aw-sort" label="Order within the year" hint="Lower numbers come first.">
          <input
            id="aw-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <div>
          <Check
            checked={d.tbc}
            onChange={(v) => set('tbc', v)}
            hint="Shows a flag on the awards page until you untick it."
          >
            To be confirmed
          </Check>
          <Check checked={d.visible} onChange={(v) => set('visible', v)}>
            Show on the awards page
          </Check>
        </div>
      </div>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          award
            ? () => crud.remove(award.id, award.award, () => deleteAwardAction(award.id))
            : undefined
        }
      />
    </form>
  );
}

/* ------------------------------------------------------------ publications */

export function PublicationsManager({
  publications,
  people,
  linked,
  fromPosts,
}: {
  publications: Publication[];
  fromPosts: PostWork[];
  people: PersonOption[];
  linked: Record<string, string[]>;
}) {
  const crud = useCrud<Publication>(publications);
  const [links, setLinks] = useState(linked);
  const current = crud.items.find((p) => p.id === crud.editing) ?? null;

  return (
    <div className="space-y-10">
      <Workspace
        items={crud.items}
        editing={crud.editing}
        onEdit={crud.open}
        addLabel="Add a paper, poster or report"
        empty="No publications yet."
        row={(p) => (
          <>
            <span className="label-mono text-muted">
              {p.year} · {PUB_KIND_LABEL[p.kind]}
            </span>
            <span className="block">{p.title}</span>
            {flags(p)}
          </>
        )}
        form={
          crud.editing ? (
            <PublicationForm
              key={crud.editing}
              pub={current}
              people={people}
              linked={links[crud.editing] ?? []}
              crud={crud}
              onLinked={(id, ids) => setLinks((l) => ({ ...l, [id]: ids }))}
            />
          ) : null
        }
      />
      <PostWorks items={fromPosts} noun="publications" />
    </div>
  );
}

function PublicationForm({
  pub,
  people,
  linked,
  crud,
  onLinked,
}: {
  pub: Publication | null;
  people: PersonOption[];
  linked: string[];
  crud: ReturnType<typeof useCrud<Publication>>;
  onLinked: (id: string, ids: string[]) => void;
}) {
  const [d, setD] = useState({
    kind: pub?.kind ?? ('paper' as Publication['kind']),
    year: pub ? String(pub.year) : String(new Date().getFullYear()),
    title: pub?.title ?? '',
    venue: pub?.venue ?? '',
    href: pub?.href ?? '',
    authors: pub?.authors ?? '',
    tbc: pub?.tbc ?? false,
    visible: pub?.visible ?? true,
    sort_order: String(pub?.sort_order ?? 0),
  });
  const [ids, setIds] = useState(linked);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({
    ...d,
    year: num(d.year),
    sort_order: num(d.sort_order),
    href: d.href.trim() || null,
  });
  const valid = publicationSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(async () => {
          const res = await savePublicationAction({
            id: pub?.id ?? null,
            values: values(),
            people: ids,
          });
          if (res.ok) onLinked(res.data.id, ids);
          return res;
        });
      }}
    >
      <h3 className="text-xl">{pub ? 'Edit publication' : 'Add a publication'}</h3>
      <Field id="pb-title" label="Title" error={err('title')}>
        <textarea
          id="pb-title"
          rows={2}
          value={d.title}
          onChange={(e) => set('title', e.target.value)}
          className={areaClass}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="pb-kind" label="Type">
          <select
            id="pb-kind"
            value={d.kind}
            onChange={(e) => set('kind', e.target.value as Publication['kind'])}
            className={fieldClass}
          >
            {PUB_KINDS.map((k) => (
              <option key={k} value={k}>
                {PUB_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="pb-year" label="Year" error={err('year')}>
          <input
            id="pb-year"
            inputMode="numeric"
            value={d.year}
            onChange={(e) => set('year', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <Field id="pb-sort" label="Order" hint="Lower first, within a year.">
          <input
            id="pb-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field id="pb-venue" label="Journal, conference or venue">
        <input
          id="pb-venue"
          value={d.venue}
          onChange={(e) => set('venue', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field id="pb-href" label="Link (optional)" error={err('href')}>
        <input
          id="pb-href"
          type="url"
          placeholder="https://"
          value={d.href}
          onChange={(e) => set('href', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <PeoplePicker options={people} value={ids} onChange={setIds} label="Authors from the team" />
      <Field
        id="pb-authors"
        label="Authors (text, optional)"
        hint="Leave empty to list the linked people. Fill it in to name outside co-authors too."
      >
        <input
          id="pb-authors"
          value={d.authors}
          onChange={(e) => set('authors', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <div>
        <Check
          checked={d.tbc}
          onChange={(v) => set('tbc', v)}
          hint="Shows a flag on the publications page until you untick it."
        >
          To be confirmed
        </Check>
        <Check checked={d.visible} onChange={(v) => set('visible', v)}>
          Show on the publications page
        </Check>
      </div>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          pub
            ? () => crud.remove(pub.id, 'this publication', () => deletePublicationAction(pub.id))
            : undefined
        }
      />
    </form>
  );
}

/* ---------------------------------------------------------------- partners */

export function PartnersManager({ partners }: { partners: Partner[] }) {
  const crud = useCrud<Partner>(partners);
  const current = crud.items.find((p) => p.id === crud.editing) ?? null;

  return (
    <Workspace
      items={crud.items}
      editing={crud.editing}
      onEdit={crud.open}
      addLabel="Add a partner"
      empty="No partners yet."
      row={(p) => {
        const logo = mediaUrl(p.logo_path);
        return (
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-16 shrink-0 items-center justify-center border border-line bg-surface text-[0.8rem] text-muted">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-8 w-14 object-contain" />
              ) : (
                (p.short || p.name).slice(0, 6)
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate">{p.name}</span>
              <span className="label-mono text-muted">
                {p.kind === 'national' ? 'National' : 'International'}
                {!p.visible ? ' · Hidden' : ''}
              </span>
            </span>
          </span>
        );
      }}
      form={crud.editing ? <PartnerForm key={crud.editing} partner={current} crud={crud} /> : null}
    />
  );
}

function PartnerForm({
  partner,
  crud,
}: {
  partner: Partner | null;
  crud: ReturnType<typeof useCrud<Partner>>;
}) {
  const toast = useToast();
  const [d, setD] = useState({
    name: partner?.name ?? '',
    short: partner?.short ?? '',
    kind: partner?.kind ?? ('national' as Partner['kind']),
    place: partner?.place ?? '',
    url: partner?.url ?? '',
    logo_path: partner?.logo_path ?? (null as string | null),
    visible: partner?.visible ?? true,
    sort_order: String(partner?.sort_order ?? 0),
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({
    ...d,
    sort_order: num(d.sort_order),
    url: d.url.trim() || null,
  });
  const valid = partnerSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(() => savePartnerAction({ id: partner?.id ?? null, values: values() }));
      }}
    >
      <h3 className="text-xl">{partner ? `Edit ${partner.name}` : 'Add a partner'}</h3>
      <Field id="pt-name" label="Name" error={err('name')}>
        <input
          id="pt-name"
          value={d.name}
          onChange={(e) => set('name', e.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="pt-short"
          label="Short name"
          hint="Shown on the tile when there is no logo."
          error={err('short')}
        >
          <input
            id="pt-short"
            value={d.short}
            maxLength={24}
            onChange={(e) => set('short', e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field id="pt-kind" label="Kind">
          <select
            id="pt-kind"
            value={d.kind}
            onChange={(e) => set('kind', e.target.value as Partner['kind'])}
            className={fieldClass}
          >
            <option value="national">National</option>
            <option value="international">International</option>
          </select>
        </Field>
        <Field id="pt-place" label="Country (optional)">
          <input
            id="pt-place"
            value={d.place}
            onChange={(e) => set('place', e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field id="pt-url" label="Website (optional)" error={err('url')}>
        <input
          id="pt-url"
          type="url"
          placeholder="https://"
          value={d.url}
          onChange={(e) => set('url', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <div>
        <p className="label-mono mb-2 text-muted">Logo</p>
        <ImageUploader
          name="logo"
          noun="logo"
          showAlt={false}
          fit="contain"
          value={{ path: d.logo_path, alt: d.name }}
          onChange={(v) => set('logo_path', v.path)}
          onError={(m) => toast.push(m, 'error')}
        />
        <p className="mt-2 text-[0.9rem] text-muted">
          Every logo is shown in the same standard box, in grey until hovered. A wide logo on a
          transparent or white background works best.
        </p>
        {err('logo_path') ? <p className="text-[0.9rem] text-danger">{err('logo_path')}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="pt-sort" label="Order" hint="Lower numbers come first.">
          <input
            id="pt-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <Check checked={d.visible} onChange={(v) => set('visible', v)}>
          Show on the partners wall
        </Check>
      </div>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          partner
            ? () => crud.remove(partner.id, partner.name, () => deletePartnerAction(partner.id))
            : undefined
        }
      />
    </form>
  );
}

/* ---------------------------------------------------------------- featured */

export function FeaturedManager({ items }: { items: FeaturedItem[] }) {
  const crud = useCrud<FeaturedItem>(items);
  const current = crud.items.find((f) => f.id === crud.editing) ?? null;
  return (
    <Workspace
      items={crud.items}
      editing={crud.editing}
      onEdit={crud.open}
      addLabel="Add a featured item"
      empty="No featured research yet."
      row={(f) => (
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden border border-line bg-surface text-[0.8rem] text-muted">
            {f.figure_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(f.figure_path) ?? ''}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              f.year
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate">{f.title}</span>
            <span className="label-mono text-muted">
              {f.kind === 'project' ? 'Project' : 'Paper'} · {f.year}
              {!f.figure_path ? ' · No figure yet' : ''}
            </span>
            {flags(f)}
          </span>
        </span>
      )}
      form={crud.editing ? <FeaturedForm key={crud.editing} item={current} crud={crud} /> : null}
    />
  );
}

function FeaturedForm({
  item,
  crud,
}: {
  item: FeaturedItem | null;
  crud: ReturnType<typeof useCrud<FeaturedItem>>;
}) {
  const toast = useToast();
  const [d, setD] = useState({
    kind: item?.kind ?? ('paper' as FeaturedItem['kind']),
    year: String(item?.year ?? new Date().getFullYear()),
    title: item?.title ?? '',
    venue: item?.venue ?? '',
    summary: item?.summary ?? '',
    key_partners: item?.key_partners ?? '',
    href: item?.href ?? '',
    figure_path: item?.figure_path ?? (null as string | null),
    figure_caption: item?.figure_caption ?? '',
    tbc: item?.tbc ?? false,
    visible: item?.visible ?? true,
    sort_order: String(item?.sort_order ?? 0),
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({
    ...d,
    year: Number(d.year),
    sort_order: num(d.sort_order),
    href: d.href.trim() || null,
  });
  const valid = featuredSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(() => saveFeaturedAction({ id: item?.id ?? null, values: values() }));
      }}
    >
      <h3 className="text-xl">{item ? 'Edit featured item' : 'Add a featured item'}</h3>
      <Field id="ft-title" label="Title" error={err('title')}>
        <input
          id="ft-title"
          value={d.title}
          onChange={(e) => set('title', e.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="ft-kind" label="Kind">
          <select
            id="ft-kind"
            value={d.kind}
            onChange={(e) => set('kind', e.target.value as FeaturedItem['kind'])}
            className={fieldClass}
          >
            <option value="paper">Paper</option>
            <option value="project">Project</option>
          </select>
        </Field>
        <Field id="ft-year" label="Year" error={err('year')}>
          <input
            id="ft-year"
            inputMode="numeric"
            value={d.year}
            onChange={(e) => set('year', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <Field id="ft-venue" label="Journal or event">
          <input
            id="ft-venue"
            value={d.venue}
            onChange={(e) => set('venue', e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field
        id="ft-summary"
        label="Summary"
        hint="Shown in full on the research page and shortened on the home page."
        error={err('summary')}
      >
        <textarea
          id="ft-summary"
          rows={7}
          value={d.summary}
          onChange={(e) => set('summary', e.target.value)}
          className={areaClass}
        />
      </Field>
      <Field id="ft-partners" label="Key partners" error={err('key_partners')}>
        <input
          id="ft-partners"
          value={d.key_partners}
          onChange={(e) => set('key_partners', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field id="ft-href" label="Link to the publication (optional)" error={err('href')}>
        <input
          id="ft-href"
          type="url"
          placeholder="https://"
          value={d.href}
          onChange={(e) => set('href', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <div>
        <p className="label-mono mb-2 text-muted">Figure</p>
        <ImageUploader
          name="figure"
          noun="figure"
          showAlt={false}
          fit="contain"
          value={{ path: d.figure_path, alt: d.title }}
          onChange={(v) => set('figure_path', v.path)}
          onError={(m) => toast.push(m, 'error')}
        />
        <p className="mt-2 text-[0.9rem] text-muted">
          Use the paper’s own figure and keep the credit in the caption below.
        </p>
        {err('figure_path') ? (
          <p className="text-[0.9rem] text-danger">{err('figure_path')}</p>
        ) : null}
      </div>
      <Field
        id="ft-caption"
        label="Figure caption and credit"
        hint="Describes the figure for people who cannot see it, and credits the source."
        error={err('figure_caption')}
      >
        <input
          id="ft-caption"
          value={d.figure_caption}
          onChange={(e) => set('figure_caption', e.target.value)}
          className={fieldClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ft-sort" label="Order" hint="Lower numbers come first.">
          <input
            id="ft-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <div className="space-y-2">
          <Check checked={d.tbc} onChange={(v) => set('tbc', v)}>
            To be confirmed
          </Check>
          <Check checked={d.visible} onChange={(v) => set('visible', v)}>
            Show on the site
          </Check>
        </div>
      </div>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          item
            ? () => crud.remove(item.id, 'this featured item', () => deleteFeaturedAction(item.id))
            : undefined
        }
      />
    </form>
  );
}

/* ----------------------------------------------------------- collaborations */

export function CollabsManager({ items }: { items: CollabProject[] }) {
  const crud = useCrud<CollabProject>(items);
  const current = crud.items.find((c) => c.id === crud.editing) ?? null;
  return (
    <Workspace
      items={crud.items}
      editing={crud.editing}
      onEdit={crud.open}
      addLabel="Add a project"
      empty="No open-invitation projects yet."
      row={(c) => (
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-[0.8rem] text-muted">
            {c.contact_photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(c.contact_photo_path) ?? ''}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (c.contact_name || '?').slice(0, 1)
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate">{c.title}</span>
            <span className="label-mono text-muted">
              {c.contact_name || 'No contact yet'}
              {!c.visible ? ' · Hidden' : ''}
            </span>
          </span>
        </span>
      )}
      form={crud.editing ? <CollabForm key={crud.editing} item={current} crud={crud} /> : null}
    />
  );
}

function CollabForm({
  item,
  crud,
}: {
  item: CollabProject | null;
  crud: ReturnType<typeof useCrud<CollabProject>>;
}) {
  const toast = useToast();
  const [d, setD] = useState({
    title: item?.title ?? '',
    summary: item?.summary ?? '',
    contact_name: item?.contact_name ?? '',
    contact_role: item?.contact_role ?? 'Project contact',
    contact_bio: item?.contact_bio ?? '',
    contact_email: item?.contact_email ?? '',
    contact_photo_path: item?.contact_photo_path ?? (null as string | null),
    visible: item?.visible ?? true,
    sort_order: String(item?.sort_order ?? 0),
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({ ...d, sort_order: num(d.sort_order) });
  const valid = collabSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(() => saveCollabAction({ id: item?.id ?? null, values: values() }));
      }}
    >
      <h3 className="text-xl">{item ? `Edit ${item.title}` : 'Add a project'}</h3>
      <Field id="cb-title" label="Project name" error={err('title')}>
        <input
          id="cb-title"
          value={d.title}
          onChange={(e) => set('title', e.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      <Field id="cb-summary" label="What it is about" error={err('summary')}>
        <textarea
          id="cb-summary"
          rows={5}
          value={d.summary}
          onChange={(e) => set('summary', e.target.value)}
          className={areaClass}
        />
      </Field>
      <fieldset className="space-y-4 border border-line p-4">
        <legend className="label-mono px-2 text-muted">Project contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cb-name" label="Name" error={err('contact_name')}>
            <input
              id="cb-name"
              value={d.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field id="cb-role" label="Role" error={err('contact_role')}>
            <input
              id="cb-role"
              value={d.contact_role}
              onChange={(e) => set('contact_role', e.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field
          id="cb-email"
          label="Email (optional)"
          hint="Leave empty until the person confirms their address can be shown."
          error={err('contact_email')}
        >
          <input
            id="cb-email"
            type="email"
            value={d.contact_email}
            onChange={(e) => set('contact_email', e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field id="cb-bio" label="Short details (optional)" error={err('contact_bio')}>
          <textarea
            id="cb-bio"
            rows={3}
            value={d.contact_bio}
            onChange={(e) => set('contact_bio', e.target.value)}
            className={areaClass}
          />
        </Field>
        <div>
          <p className="label-mono mb-2 text-muted">Photo</p>
          <ImageUploader
            name="contact"
            noun="photo"
            showAlt={false}
            value={{ path: d.contact_photo_path, alt: d.contact_name }}
            onChange={(v) => set('contact_photo_path', v.path)}
            onError={(m) => toast.push(m, 'error')}
          />
          {err('contact_photo_path') ? (
            <p className="text-[0.9rem] text-danger">{err('contact_photo_path')}</p>
          ) : null}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cb-sort" label="Order" hint="Lower numbers come first.">
          <input
            id="cb-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <Check checked={d.visible} onChange={(v) => set('visible', v)}>
          Show on the open invitation page
        </Check>
      </div>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          item
            ? () => crud.remove(item.id, item.title, () => deleteCollabAction(item.id))
            : undefined
        }
      />
    </form>
  );
}

/* ---------------------------------------------------------------- research */

export function ResearchManager({
  themes,
  topics,
  spotlights,
}: {
  themes: ResearchTheme[];
  topics: ResearchTopic[];
  spotlights: Spotlight[];
}) {
  const crud = useCrud<ResearchTheme>(themes);
  const current = crud.items.find((t) => t.id === crud.editing) ?? null;

  return (
    <div className="space-y-12">
      <section aria-labelledby="themes-h" className="space-y-4">
        <div>
          <h2 id="themes-h" className="text-2xl">
            Research themes
          </h2>
          <p className="mt-1 max-w-[62ch] text-muted">
            The headings on the home and research pages count the themes, so adding a fifth theme
            changes “Four themes” to “Five themes” everywhere.
          </p>
        </div>
        <Workspace
          items={crud.items}
          editing={crud.editing}
          onEdit={crud.open}
          addLabel="Add a theme"
          empty="No research themes yet."
          row={(t) => (
            <>
              <span className="label-mono text-muted">
                {t.projects.length} {t.projects.length === 1 ? 'project' : 'projects'}
              </span>
              <span className="block">{t.title}</span>
              {flags(t)}
            </>
          )}
          form={crud.editing ? <ThemeForm key={crud.editing} theme={current} crud={crud} /> : null}
        />
      </section>
      <SpotlightsSection spotlights={spotlights} />
      <TopicsEditor topics={topics} />
    </div>
  );
}

function ThemeForm({
  theme,
  crud,
}: {
  theme: ResearchTheme | null;
  crud: ReturnType<typeof useCrud<ResearchTheme>>;
}) {
  const [d, setD] = useState({
    title: theme?.title ?? '',
    style: theme?.style ?? ('land' as ResearchTheme['style']),
    visible: theme?.visible ?? true,
    sort_order: String(theme?.sort_order ?? 0),
    projects: (theme?.projects ?? []).map((p) => ({ title: p.title, src_funded: p.src_funded })),
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({
    ...d,
    sort_order: num(d.sort_order),
    projects: d.projects.filter((p) => p.title.trim() !== ''),
  });
  const valid = themeSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);
  const setProject = (i: number, patch: Partial<(typeof d.projects)[number]>) =>
    set(
      'projects',
      d.projects.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    );

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(() => saveThemeAction({ id: theme?.id ?? null, values: values() }));
      }}
    >
      <h3 className="text-xl">{theme ? `Edit ${theme.title}` : 'Add a research theme'}</h3>
      <Field id="th-title" label="Title" error={err('title')}>
        <input
          id="th-title"
          value={d.title}
          onChange={(e) => set('title', e.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="th-style" label="Colour and pattern">
          <select
            id="th-style"
            value={d.style}
            onChange={(e) => set('style', e.target.value as ResearchTheme['style'])}
            className={fieldClass}
          >
            {THEME_STYLES.map((s) => (
              <option key={s} value={s}>
                {THEME_STYLE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="th-sort" label="Order" hint="Lower numbers come first.">
          <input
            id="th-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
      </div>
      <fieldset className="space-y-3">
        <legend className="label-mono mb-2 text-muted">Projects</legend>
        {d.projects.map((p, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              aria-label={`Project ${i + 1} title`}
              value={p.title}
              onChange={(e) => setProject(i, { title: e.target.value })}
              className={`${fieldClass} min-w-0 flex-1 basis-64`}
            />
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[0.9rem]">
              <input
                type="checkbox"
                checked={p.src_funded}
                onChange={(e) => setProject(i, { src_funded: e.target.checked })}
                className="h-5 w-5 accent-[var(--signal)]"
              />
              SRC-funded
            </label>
            <button
              type="button"
              aria-label={`Remove project ${i + 1}`}
              onClick={() =>
                set(
                  'projects',
                  d.projects.filter((_, j) => j !== i),
                )
              }
              className={buttonClass('ghost', '', 'icon')}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {err('projects') ? <p className="text-[0.9rem] text-danger">{err('projects')}</p> : null}
        <button
          type="button"
          onClick={() => set('projects', [...d.projects, { title: '', src_funded: false }])}
          className={buttonClass('secondary', '', 'sm')}
        >
          <Plus size={16} aria-hidden="true" /> Add a project
        </button>
      </fieldset>
      <Check checked={d.visible} onChange={(v) => set('visible', v)}>
        Show on the research page and home page
      </Check>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          theme
            ? () => crud.remove(theme.id, theme.title, () => deleteThemeAction(theme.id))
            : undefined
        }
      />
    </form>
  );
}

function TopicsEditor({ topics }: { topics: ResearchTopic[] }) {
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState(topics.map((t) => t.title).join('\n'));
  const [busy, start] = useTransition();
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <section aria-labelledby="topics-h" className="space-y-3">
      <h2 id="topics-h" className="text-2xl">
        Wider topics
      </h2>
      <p className="max-w-[62ch] text-muted">
        One topic per line. They appear in “Wider topics in the department” on the research page.
      </p>
      <textarea
        aria-labelledby="topics-h"
        rows={Math.min(14, Math.max(5, lines.length + 1))}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={areaClass}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            const res = await saveTopicsAction({ topics: lines });
            if (!res.ok) return toast.push(res.message, 'error');
            toast.push('Saved. The research page is updated.');
            router.refresh();
          })
        }
        className={buttonClass('primary')}
      >
        {busy ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : (
          <Save size={16} aria-hidden="true" />
        )}
        Save topics ({lines.length})
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ import */

/** Shown on the content hub while a table is empty: loads what the site used to show from code. */
export function ImportStarter() {
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <div className="border border-dashed border-line-strong p-5">
      <p className="font-semibold">Some sections are still empty</p>
      <p className="mt-1 max-w-[62ch] text-muted">
        Load the sourced starter content (awards, papers, partners and research themes) into every
        empty section. Anything you already added is left alone.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            const res = await importStarterContentAction();
            if (!res.ok) return toast.push(res.message, 'error');
            toast.push(
              res.data.added.length
                ? `Loaded: ${res.data.added.join(', ')}.`
                : 'Nothing to load, every section already has content.',
            );
            router.refresh();
          })
        }
        className={`${buttonClass('secondary')} mt-4`}
      >
        {busy ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : (
          <Download size={16} aria-hidden="true" />
        )}
        Load starter content
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- journey */

export interface PostOption {
  id: string;
  title: string;
  tbc: boolean;
}

export function JourneyManager({
  milestones,
  posts,
}: {
  milestones: Milestone[];
  posts: PostOption[];
}) {
  const crud = useCrud<Milestone>(milestones);
  const current = crud.items.find((m) => m.id === crud.editing) ?? null;
  const postById = new Map(posts.map((p) => [p.id, p]));

  return (
    <Workspace
      items={crud.items}
      editing={crud.editing}
      onEdit={crud.open}
      addLabel="Add a timeline entry"
      empty="No timeline entries yet."
      row={(m) => {
        const linked = m.post_id ? postById.get(m.post_id) : undefined;
        return (
          <>
            <span className="label-mono text-muted">
              {m.when_label || m.year}
              {linked ? ' · linked to a post' : ''}
            </span>
            <span className="block">{m.title}</span>
            {flags({ tbc: linked ? linked.tbc : m.own_tbc, visible: m.visible })}
          </>
        );
      }}
      form={
        crud.editing ? (
          <MilestoneForm key={crud.editing} milestone={current} posts={posts} crud={crud} />
        ) : null
      }
    />
  );
}

function MilestoneForm({
  milestone,
  posts,
  crud,
}: {
  milestone: Milestone | null;
  posts: PostOption[];
  crud: ReturnType<typeof useCrud<Milestone>>;
}) {
  const [d, setD] = useState({
    year: milestone?.year ?? String(new Date().getFullYear()),
    when_label: milestone?.when_label ?? '',
    title: milestone?.title ?? '',
    detail: milestone?.detail ?? '',
    links: milestone?.links ?? ([] as { label: string; href: string }[]),
    tbc: milestone?.own_tbc ?? false,
    post_id: milestone?.post_id ?? '',
    visible: milestone?.visible ?? true,
    sort_order: String(milestone?.sort_order ?? 0),
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({
    ...d,
    sort_order: num(d.sort_order),
    post_id: d.post_id || null,
    links: d.links.filter((l) => l.href.trim() !== ''),
  });
  const valid = milestoneSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);
  const linked = posts.find((p) => p.id === d.post_id);

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(() => saveMilestoneAction({ id: milestone?.id ?? null, values: values() }));
      }}
    >
      <h3 className="text-xl">{milestone ? 'Edit timeline entry' : 'Add a timeline entry'}</h3>
      <Field id="ms-title" label="Title" error={err('title')}>
        <input
          id="ms-title"
          value={d.title}
          onChange={(e) => set('title', e.target.value)}
          className={fieldClass}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="ms-year" label="Year (big number)" error={err('year')}>
          <input
            id="ms-year"
            value={d.year}
            maxLength={10}
            onChange={(e) => set('year', e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field id="ms-when" label="Date wording" hint="For example May 2025.">
          <input
            id="ms-when"
            value={d.when_label}
            onChange={(e) => set('when_label', e.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field id="ms-sort" label="Order" hint="Oldest first; lower numbers come first.">
          <input
            id="ms-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field id="ms-detail" label="Details" error={err('detail')}>
        <textarea
          id="ms-detail"
          rows={5}
          value={d.detail}
          onChange={(e) => set('detail', e.target.value)}
          className={areaClass}
        />
      </Field>
      <fieldset className="space-y-3">
        <legend className="label-mono mb-1 text-muted">Links</legend>
        {d.links.map((l, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              aria-label={`Name of link ${i + 1}`}
              placeholder="Label"
              value={l.label}
              onChange={(e) =>
                set(
                  'links',
                  d.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                )
              }
              className={`${fieldClass} w-44`}
            />
            <input
              aria-label={`Address of link ${i + 1}`}
              type="url"
              placeholder="https://"
              value={l.href}
              onChange={(e) =>
                set(
                  'links',
                  d.links.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)),
                )
              }
              className={`${fieldClass} min-w-0 flex-1 basis-56`}
            />
            <button
              type="button"
              aria-label={`Remove link ${i + 1}`}
              onClick={() =>
                set(
                  'links',
                  d.links.filter((_, j) => j !== i),
                )
              }
              className={buttonClass('ghost', '', 'icon')}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {err('links') ? <p className="text-[0.9rem] text-danger">{err('links')}</p> : null}
        {d.links.length < 6 ? (
          <button
            type="button"
            onClick={() => set('links', [...d.links, { label: '', href: '' }])}
            className={buttonClass('secondary', '', 'sm')}
          >
            <Plus size={16} aria-hidden="true" /> Add a link
          </button>
        ) : null}
      </fieldset>
      <Field
        id="ms-post"
        label="Tied to a news post (optional)"
        hint="When tied, this entry shows the post's To be confirmed switch. Change it on the post and the timeline follows."
      >
        <select
          id="ms-post"
          value={d.post_id}
          onChange={(e) => set('post_id', e.target.value)}
          className={fieldClass}
        >
          <option value="">Not tied to a post</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </Field>
      <Check
        checked={d.tbc}
        onChange={(v) => set('tbc', v)}
        hint={
          linked
            ? 'This entry is tied to a post, so ticking or unticking this also changes the switch on that post and everywhere it appears.'
            : 'Shows a flag on the research page until you untick it.'
        }
      >
        To be confirmed
      </Check>
      <Check checked={d.visible} onChange={(v) => set('visible', v)}>
        Show on the research page
      </Check>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          milestone
            ? () =>
                crud.remove(milestone.id, milestone.title, () =>
                  deleteMilestoneAction(milestone.id),
                )
            : undefined
        }
      />
    </form>
  );
}

function SpotlightsSection({ spotlights }: { spotlights: Spotlight[] }) {
  const crud = useCrud<Spotlight>(spotlights);
  const current = crud.items.find((s) => s.id === crud.editing) ?? null;
  return (
    <section aria-labelledby="spot-h" className="space-y-4">
      <div>
        <h2 id="spot-h" className="text-2xl">
          Spotlight projects
        </h2>
        <p className="mt-1 max-w-[62ch] text-muted">
          Highlighted projects shown as their own cards at the bottom of the research page, such as
          the 4ONSE weather station. Add as many as you need.
        </p>
      </div>
      <Workspace
        items={crud.items}
        editing={crud.editing}
        onEdit={crud.open}
        addLabel="Add a spotlight project"
        empty="No spotlight projects yet."
        row={(s) => (
          <>
            <span className="label-mono text-muted">{s.label || 'Project'}</span>
            <span className="block">{s.title}</span>
            {flags(s)}
          </>
        )}
        form={
          crud.editing ? <SpotlightForm key={crud.editing} spotlight={current} crud={crud} /> : null
        }
      />
    </section>
  );
}

function SpotlightForm({
  spotlight,
  crud,
}: {
  spotlight: Spotlight | null;
  crud: ReturnType<typeof useCrud<Spotlight>>;
}) {
  const [d, setD] = useState({
    title: spotlight?.title ?? '',
    label: spotlight?.label ?? '',
    summary: spotlight?.summary ?? '',
    points: (spotlight?.points ?? []).join('\n'),
    note: spotlight?.note ?? '',
    tbc: spotlight?.tbc ?? false,
    visible: spotlight?.visible ?? true,
    sort_order: String(spotlight?.sort_order ?? 0),
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const values = () => ({
    ...d,
    sort_order: num(d.sort_order),
    points: d.points
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  });
  const valid = spotlightSchema.safeParse(values()).success;
  const err = (k: string) => first(crud.errors, k);

  return (
    <form
      noValidate
      className="space-y-5 border border-line-strong p-5"
      onSubmit={(e) => {
        e.preventDefault();
        crud.save(() => saveSpotlightAction({ id: spotlight?.id ?? null, values: values() }));
      }}
    >
      <h3 className="text-xl">
        {spotlight ? `Edit ${spotlight.title}` : 'Add a spotlight project'}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sp-title" label="Name" error={err('title')}>
          <input
            id="sp-title"
            value={d.title}
            onChange={(e) => set('title', e.target.value)}
            className={fieldClass}
            required
          />
        </Field>
        <Field id="sp-label" label="Small label" hint="For example Weather station.">
          <input
            id="sp-label"
            value={d.label}
            onChange={(e) => set('label', e.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
      <Field id="sp-summary" label="Summary" error={err('summary')}>
        <textarea
          id="sp-summary"
          rows={3}
          value={d.summary}
          onChange={(e) => set('summary', e.target.value)}
          className={areaClass}
        />
      </Field>
      <Field
        id="sp-points"
        label="Key points"
        hint="One per line, shown as a list beside the summary."
      >
        <textarea
          id="sp-points"
          rows={4}
          value={d.points}
          onChange={(e) => set('points', e.target.value)}
          className={areaClass}
        />
      </Field>
      <Field
        id="sp-note"
        label="Note (optional)"
        hint="Partners, status or anything else worth saying."
      >
        <textarea
          id="sp-note"
          rows={3}
          value={d.note}
          onChange={(e) => set('note', e.target.value)}
          className={areaClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sp-sort" label="Order" hint="Lower numbers come first.">
          <input
            id="sp-sort"
            inputMode="numeric"
            value={d.sort_order}
            onChange={(e) => set('sort_order', numeric(e.target.value))}
            className={fieldClass}
          />
        </Field>
        <div>
          <Check
            checked={d.tbc}
            onChange={(v) => set('tbc', v)}
            hint="Shows a flag until you untick it."
          >
            To be confirmed
          </Check>
          <Check checked={d.visible} onChange={(v) => set('visible', v)}>
            Show on the research page
          </Check>
        </div>
      </div>
      <FormFooter
        busy={crud.busy}
        valid={valid}
        onCancel={() => crud.open(null)}
        onDelete={
          spotlight
            ? () =>
                crud.remove(spotlight.id, spotlight.title, () =>
                  deleteSpotlightAction(spotlight.id),
                )
            : undefined
        }
      />
    </form>
  );
}

const STATE_NOTE = { live: 'Published', scheduled: 'Scheduled', draft: 'Draft (hidden)' } as const;

/**
 * Posts ticked "On the awards / publications page" in their editor. They appear on that public page next to
 * the entries above, so they are listed here too. They are edited as posts, in one place.
 */
function PostWorks({ items, noun }: { items: PostWork[]; noun: 'awards' | 'publications' }) {
  return (
    <section aria-labelledby={`pw-${noun}`} className="space-y-3">
      <div>
        <h2 id={`pw-${noun}`} className="text-2xl">
          From news posts <span className="text-muted">({items.length})</span>
        </h2>
        <p className="mt-1 max-w-[62ch] text-muted">
          Posts ticked “On the {noun} page” also appear on the public {noun} page. Edit one as a
          post, and the change shows here and on the page.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="border border-dashed border-line-strong p-5 text-muted">
          No posts are ticked for the {noun} page yet.
        </p>
      ) : (
        <ul className="border-t border-line">
          {items.map((p) => (
            <li key={p.id} className="border-b border-line">
              <Link href={`/admin/posts/${p.id}`} className="block px-3 py-3 hover:bg-surface-2">
                <span className="label-mono text-muted">
                  {p.year} · {p.category} · {STATE_NOTE[p.state]}
                </span>
                <span className="block">{p.title}</span>
                {p.tbc ? (
                  <span className="mt-1 block">
                    <TbcFlag />
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
