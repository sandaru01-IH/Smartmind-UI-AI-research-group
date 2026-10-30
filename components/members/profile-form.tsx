'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { saveProfileAction } from '@/app/blog-actions';
import { Field, areaClass, fieldClass } from '@/components/admin/form-bits';
import { ImageUploader } from '@/components/admin/image-uploader';
import { useToast } from '@/components/admin/toast';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { memberProfileSchema } from '@/lib/blog/schema';
import { uploadMemberImage } from './member-upload';

type Errors = Record<string, string[]>;

/** Name, photo and short bio: how a member appears on their posts and comments. */
export function ProfileForm({
  initial,
}: {
  initial: { displayName: string; bio: string; photoPath: string | null };
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [d, setD] = useState({
    display_name: initial.displayName,
    bio: initial.bio,
    photo_path: initial.photoPath,
  });
  const valid = memberProfileSchema.safeParse(d).success;

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setErrors({});
          const r = await saveProfileAction(d);
          if (r.ok) toast.push(t.blog.profileSaved);
          else {
            setErrors(r.fieldErrors ?? {});
            toast.push(r.message, 'error');
          }
        });
      }}
    >
      <Field id="pf-name" label={t.members.displayName} error={errors.display_name?.[0]}>
        <input
          id="pf-name"
          value={d.display_name}
          onChange={(e) => setD((p) => ({ ...p, display_name: e.target.value }))}
          maxLength={80}
          className={fieldClass}
          required
        />
      </Field>
      <div>
        <p className="label-mono mb-2 text-muted">{t.blog.photoLabel}</p>
        <ImageUploader
          name="profile"
          noun="photo"
          showAlt={false}
          value={{ path: d.photo_path, alt: d.display_name }}
          onChange={(v) => setD((p) => ({ ...p, photo_path: v.path }))}
          onError={(m) => toast.push(m, 'error')}
          upload={uploadMemberImage}
        />
      </div>
      <Field id="pf-bio" label={t.blog.bioLabel} hint={t.blog.bioHint} error={errors.bio?.[0]}>
        <textarea
          id="pf-bio"
          rows={4}
          value={d.bio}
          onChange={(e) => setD((p) => ({ ...p, bio: e.target.value }))}
          maxLength={500}
          className={areaClass}
        />
      </Field>
      <button type="submit" disabled={pending || !valid} className={buttonClass('primary')}>
        {pending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : null}
        {t.blog.saveProfile}
      </button>
    </form>
  );
}
