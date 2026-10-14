import { ButtonLink } from '@/components/ui/button';
import { COLLABORATE } from '@/content/contact';
import { t } from '@/content/strings';

export function CollaborateCta() {
  return (
    <div className="grid-12 items-end gap-y-8 border border-line-strong bg-surface p-6 md:p-12">
      <div className="col-span-12 lg:col-span-8">
        <h2 className="text-3xl md:text-5xl">{t.home.collaborateTitle}</h2>
        <p className="mt-5 max-w-[54ch] text-lg text-muted">{COLLABORATE.body[0]}</p>
      </div>
      <div className="col-span-12 lg:col-span-4 lg:justify-self-end">
        <ButtonLink href="/collaborate">{t.home.collaborateCta}</ButtonLink>
      </div>
    </div>
  );
}
