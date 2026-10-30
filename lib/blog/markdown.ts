import type { Element, Root, RootContent } from 'hast';
import { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize';
import { markdownSchema } from '@/lib/markdown';

/**
 * Sanitise schema for community posts. It is the strict news schema (no raw HTML, no iframes, links
 * limited to http, https and mailto) plus images. Images are then cut down to the site's own
 * storage by `keepOnlySiteImages`, so a post can never pull a picture from somewhere else.
 */
export const blogMarkdownSchema: SanitizeSchema = {
  ...markdownSchema,
  tagNames: [...(markdownSchema.tagNames ?? []), 'img'],
  attributes: {
    ...defaultSchema.attributes,
    ...markdownSchema.attributes,
    img: ['src', 'alt'],
  },
  protocols: { ...markdownSchema.protocols, src: ['https', 'http'] },
};

const hasDotDot = (src: string): boolean => {
  try {
    return decodeURIComponent(src).includes('..');
  } catch {
    return true;
  }
};

/**
 * Rehype plugin that removes every image whose address is not inside `prefix` (the public address of
 * the members' storage folder). With no prefix, every image goes.
 */
export function keepOnlySiteImages(prefix: string | null) {
  const allowed = (node: Element): boolean => {
    const src = node.properties?.src;
    return (
      Boolean(prefix) &&
      typeof src === 'string' &&
      src.startsWith(prefix as string) &&
      !hasDotDot(src)
    );
  };
  const walk = (parent: Root | Element): void => {
    for (let i = parent.children.length - 1; i >= 0; i--) {
      const child = parent.children[i] as RootContent;
      if (child.type !== 'element') continue;
      if (child.tagName === 'img' && !allowed(child)) parent.children.splice(i, 1);
      else walk(child);
    }
  };
  return (tree: Root) => walk(tree);
}
