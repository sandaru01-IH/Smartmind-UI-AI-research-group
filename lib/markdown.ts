import { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';

/**
 * Strict sanitise schema for post bodies: no raw HTML, no images, no iframes, and links limited to
 * http, https and mailto. Authors get headings, emphasis, lists, quotes, code, tables and links.
 */
export const markdownSchema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (t) => !['img', 'iframe', 'script', 'style', 'input'].includes(t),
  ),
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title'],
    '*': ['id'].filter(() => false),
  },
  protocols: { href: ['http', 'https', 'mailto'] },
  clobberPrefix: 'post-',
};
