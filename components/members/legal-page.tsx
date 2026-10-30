import type { LegalDocument } from '@/content/legal';

const idOf = (heading: string) => `h-${heading.replace(/\W+/g, '-')}`;

/** A legal page: title, the draft notice, then each section. */
export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <div className="container-site py-14 md:py-24">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl md:text-5xl">{doc.title}</h1>
        <p className="mt-4 text-lg text-muted">{doc.lead}</p>
        <p role="note" className="mt-6 border border-line-strong p-4 text-[0.95rem]">
          <strong>{doc.draftNotice}</strong>
        </p>
        <p className="label-mono mt-6 text-muted">Last updated {doc.updated}</p>
        <div className="mt-8 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.heading} aria-labelledby={idOf(s.heading)}>
              <h2 id={idOf(s.heading)} className="text-2xl">
                {s.heading}
              </h2>
              <div className="mt-3 space-y-3 text-lg text-muted">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
