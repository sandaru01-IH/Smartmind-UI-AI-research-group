import { BlogCard } from '@/components/blog/blog-card';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { t } from '@/content/strings';
import { listBlogPosts } from '@/lib/blog/public';
import { getHomeSections } from '@/lib/home/sections';

/** The newest community posts. Renders nothing when the admin switched it off or there are none. */
export async function LatestBlog() {
  const [sections, { posts }] = await Promise.all([getHomeSections(), listBlogPosts({ limit: 3 })]);
  if (!sections.blog || posts.length === 0) return null;
  return (
    <Section
      id="latest-blog"
      title={t.home.latestBlog}
      lead={t.home.latestBlogLead}
      action={
        <ButtonLink href="/blog" variant="secondary">
          {t.home.allBlog}
        </ButtonLink>
      }
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <li key={p.id}>
            <Reveal index={i}>
              <BlogCard post={p} />
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
