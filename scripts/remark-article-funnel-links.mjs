import { basename, extname } from 'node:path';

function textContent(node) {
  if (node.type === 'text') return node.value;
  return node.children?.map(textContent).join('') || '';
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function asciiSlug(value) {
  return value
    .replaceAll('ı', 'i')
    .replaceAll('İ', 'I')
    .replaceAll('ş', 's')
    .replaceAll('Ş', 'S')
    .replaceAll('ğ', 'g')
    .replaceAll('Ğ', 'G')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sentenceParagraph({ before, anchor, after }, enabled) {
  if (!enabled) {
    return { type: 'paragraph', children: [{ type: 'text', value: `${before}${anchor}${after}` }] };
  }

  return {
    type: 'paragraph',
    children: [
      { type: 'text', value: before },
      {
        type: 'link',
        url: '/butce-plani/',
        data: { hProperties: { className: ['article-funnel-link'] } },
        children: [{ type: 'text', value: anchor }],
      },
      { type: 'text', value: after },
    ],
  };
}

function tableOfContents(headings, enabled) {
  const items = headings.map(({ id, title }) => `<li><a href="#${id}">${escapeHtml(title)}</a></li>`);
  if (enabled) items.push('<li><a href="/butce-plani/">Kişisel bütçe planı</a></li>');

  return {
    type: 'html',
    value: `<nav class="article-toc" aria-label="İçindekiler"><p class="article-toc__title">İçindekiler</p><ul>${items.join('')}</ul></nav>`,
  };
}

function callout({ description, anchor }) {
  return {
    type: 'html',
    value: `<aside class="article-funnel-callout"><p class="article-funnel-callout__label">ŞABLON</p><p>${escapeHtml(description)}</p><p class="article-funnel-callout__link"><a class="article-funnel-link" href="/butce-plani/">${escapeHtml(anchor)}</a></p></aside>`,
  };
}

export default function remarkArticleFunnelLinks({ enabled, links }) {
  return (tree, file) => {
    if (!file.path) return;

    const slug = basename(file.path, extname(file.path));
    const article = links[slug];
    if (!article) return;

    const usedIds = new Map();
    const headings = tree.children
      .filter((node) => node.type === 'heading' && node.depth === 2)
      .map((node) => {
        const title = textContent(node);
        const baseId = asciiSlug(title);
        const count = usedIds.get(baseId) || 0;
        usedIds.set(baseId, count + 1);
        const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
        return { node, title, id };
      });

    const tocHeadings = headings.filter(({ title }) => !['Sık Sorulan Sorular', 'İlgili yazılar'].includes(title));
    const faqIndex = tree.children.findIndex(
      (node) => node.type === 'heading' && node.depth === 2 && textContent(node) === 'Sık Sorulan Sorular',
    );
    const articleBody = faqIndex === -1 ? tree.children : tree.children.slice(0, faqIndex);
    const bodyParagraphs = articleBody.filter((node) => node.type === 'paragraph');
    if (bodyParagraphs.length < 2) throw new Error(`Second body paragraph not found for ${slug}`);

    const firstParagraphIndex = tree.children.findIndex((node) => node.type === 'paragraph');
    if (firstParagraphIndex === -1) throw new Error(`Lead paragraph not found for ${slug}`);
    tree.children.splice(firstParagraphIndex + 1, 0, tableOfContents(tocHeadings, enabled));

    if (enabled) {
      const secondParagraphIndex = tree.children.findIndex((node) => node === bodyParagraphs[1]);
      const nextNode = tree.children[secondParagraphIndex + 1];
      let calloutAfterIndex = secondParagraphIndex;
      if (nextNode?.type === 'heading') {
        calloutAfterIndex = tree.children.findIndex(
          (node, index) => index > secondParagraphIndex && node.type === 'paragraph',
        );
        if (calloutAfterIndex === -1) throw new Error(`Paragraph after heading not found for ${slug}`);
      }
      tree.children.splice(calloutAfterIndex + 1, 0, callout(article.callout));
    }

    const headingIndex = tree.children.findIndex(
      (node) => node.type === 'heading' && textContent(node) === article.midAfterHeading,
    );
    if (headingIndex === -1) throw new Error(`Funnel link heading not found for ${slug}: ${article.midAfterHeading}`);

    const headingDepth = tree.children[headingIndex].depth;
    const nextSectionIndex = tree.children.findIndex(
      (node, index) => index > headingIndex && node.type === 'heading' && node.depth <= headingDepth,
    );
    const insertAt = nextSectionIndex === -1 ? tree.children.length : nextSectionIndex;
    tree.children.splice(insertAt, 0, sentenceParagraph(article.mid, enabled));
  };
}
