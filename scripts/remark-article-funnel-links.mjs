import { basename, extname } from 'node:path';

function textContent(node) {
  if (node.type === 'text') return node.value;
  return node.children?.map(textContent).join('') || '';
}

function linkParagraph({ before, anchor, after }) {
  return {
    type: 'paragraph',
    children: [
      { type: 'text', value: before },
      { type: 'link', url: '/butce-plani/', children: [{ type: 'text', value: anchor }] },
      { type: 'text', value: after },
    ],
  };
}

export default function remarkArticleFunnelLinks({ enabled, links }) {
  return (tree, file) => {
    if (!enabled || !file.path) return;

    const slug = basename(file.path, extname(file.path));
    const article = links[slug];
    if (!article) return;

    const headingIndex = tree.children.findIndex(
      (node) => node.type === 'heading' && textContent(node) === article.midAfterHeading,
    );
    if (headingIndex === -1) throw new Error(`Funnel link heading not found for ${slug}: ${article.midAfterHeading}`);

    const headingDepth = tree.children[headingIndex].depth;
    const nextSectionIndex = tree.children.findIndex(
      (node, index) => index > headingIndex && node.type === 'heading' && node.depth <= headingDepth,
    );
    const insertAt = nextSectionIndex === -1 ? tree.children.length : nextSectionIndex;
    tree.children.splice(insertAt, 0, linkParagraph(article.mid));
  };
}
