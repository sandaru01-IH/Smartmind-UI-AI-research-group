import Image from 'next/image';
import { Mail } from 'lucide-react';
import { Reveal } from '@/components/ui/reveal';
import type { CollabProject } from '@/lib/catalog/types';
import { mediaUrl } from '@/lib/supabase/env';

function Avatar({ project }: { project: CollabProject }) {
  const src = mediaUrl(project.contact_photo_path);
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-line-strong bg-surface-2">
      {src ? (
        <Image
          src={src}
          alt={project.contact_name ? `Photo of ${project.contact_name}` : ''}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center font-display text-xl text-muted"
        >
          {project.contact_name.slice(0, 1) || '·'}
        </span>
      )}
    </div>
  );
}

/** The ongoing projects open to collaboration, each with its numbered heading and project contact. */
export function CollabProjects({ projects }: { projects: CollabProject[] }) {
  if (projects.length === 0)
    return <p className="text-muted">The projects open to collaboration will appear here soon.</p>;
  return (
    <ol className="grid gap-5 md:grid-cols-2">
      {projects.map((p, i) => (
        <Reveal
          as="li"
          key={p.id}
          index={i}
          className="flex flex-col gap-5 border border-line bg-surface p-6 md:p-8"
        >
          <p aria-hidden="true" className="numeral text-4xl text-line-strong">
            {String(i + 1).padStart(2, '0')}
          </p>
          <h3 className="text-2xl">{p.title}</h3>
          {p.summary ? <p className="text-muted">{p.summary}</p> : null}
          {p.contact_name ? (
            <div className="mt-auto flex items-start gap-4 border-t border-line pt-5">
              <Avatar project={p} />
              <div className="min-w-0">
                <p className="label-mono text-muted">{p.contact_role || 'Project contact'}</p>
                <p className="font-display text-lg">{p.contact_name}</p>
                {p.contact_bio ? (
                  <p className="mt-1 text-[0.95rem] text-muted">{p.contact_bio}</p>
                ) : null}
                {p.contact_email ? (
                  <a
                    href={`mailto:${p.contact_email}`}
                    className="mt-1 inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
                  >
                    <Mail size={14} aria-hidden="true" />
                    {p.contact_email}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </Reveal>
      ))}
    </ol>
  );
}
