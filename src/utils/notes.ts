import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMarkdownProcessor, parseFrontmatter } from '@astrojs/markdown-remark';
import notesData from '@data/notes.json';

type RawNote = {
  title?: string;
  type?: string;
  date?: string;
  summary?: string;
  href?: string;
};

export type NoteEntry = {
  slug: string;
  title: string;
  type: string;
  date?: string;
  summary?: string;
  href: string;
  external: boolean;
  sourcePath?: string;
};

export type RenderedNote = NoteEntry & {
  html: string;
};

const markdownExtensions = new Set(['.md', '.mdx']);
const markdownProcessor = createMarkdownProcessor({});

const titleFromSlug = (slug: string) =>
  slug
    .split(/[/-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const slugFromHref = (href: string) => {
  const basename = path.basename(href, path.extname(href));
  return basename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const resolveMarkdownPath = (href = '') => {
  const cleanHref = decodeURI(href).replace(/^\/+/, '');

  if (cleanHref.startsWith('public/')) {
    return path.join(process.cwd(), cleanHref);
  }

  if (cleanHref.startsWith('assets/')) {
    return path.join(process.cwd(), 'public', cleanHref);
  }

  return path.join(process.cwd(), cleanHref);
};

const isMarkdownHref = (href?: string) => href && markdownExtensions.has(path.extname(href).toLowerCase());

export const getNoteEntries = (): NoteEntry[] =>
  (notesData as RawNote[]).flatMap((note) => {
    if (!note.href) {
      return [];
    }

    if (!isMarkdownHref(note.href)) {
      return [{
        slug: '',
        title: note.title ?? 'Untitled Note',
        type: note.type ?? 'Web Book',
        date: note.date,
        summary: note.summary,
        href: note.href,
        external: true,
      }];
    }

    const sourcePath = resolveMarkdownPath(note.href);
    const slug = slugFromHref(note.href);

    if (!slug || !existsSync(sourcePath)) {
      return [];
    }

    const source = readFileSync(sourcePath, 'utf8');
    const { frontmatter } = parseFrontmatter(source);

    return [{
      slug,
      title: String(frontmatter.title ?? note.title ?? titleFromSlug(slug)),
      type: String(frontmatter.type ?? note.type ?? 'Markdown'),
      date: frontmatter.date ? String(frontmatter.date) : note.date,
      summary: frontmatter.summary ? String(frontmatter.summary) : note.summary,
      href: `/notes/${slug}/`,
      external: false,
      sourcePath,
    }];
  });

export const getRenderedNote = async (slug: string): Promise<RenderedNote | undefined> => {
  const entry = getNoteEntries().find((note) => note.slug === slug && note.sourcePath);

  if (!entry?.sourcePath) {
    return undefined;
  }

  const source = readFileSync(entry.sourcePath, 'utf8');
  const { content, frontmatter } = parseFrontmatter(source);
  const processor = await markdownProcessor;
  const rendered = await processor.render(content, {
    fileURL: pathToFileURL(entry.sourcePath).href,
    frontmatter,
  });

  return {
    ...entry,
    html: rendered.code,
  };
};
