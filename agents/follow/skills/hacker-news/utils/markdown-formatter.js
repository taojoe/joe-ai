import Handlebars from 'handlebars';

/**
 * HN 文章 Markdown 模板
 */
const STORY_TEMPLATE = `---
title: "{{title}}"
date: {{date}}
source: Hacker News
url: {{url}}
points: {{points}}
author: {{author}}
discussion: {{discussionUrl}}
numComments: {{numComments}}
type: "{{sourceType}}"
{{#if matchedKeyword}}
matched: "{{matchedKeyword}}"
{{/if}}
---

# {{title}}

- **Source**: [Original Article]({{url}})
- **HN Discussion**: [Hacker News Link]({{discussionUrl}})
- **Author**: {{author}}
- **Points**: {{points}}
- **Comments**: {{numComments}}
- **Status**: {{sourceType}}
{{#if matchedKeyword}}
- **Matched Keyword**: [{{matchedKeyword}}]
{{/if}}

---

> [!TIP]
> This story was discovered because it matched a **{{sourceType}}** rule on Hacker News with **{{points}}** points.
`;

const compiledTemplate = Handlebars.compile(STORY_TEMPLATE, { noEscape: true });

export function formatStory(data) {
  return compiledTemplate(data).trim() + '\n';
}

export function generateSlug(title, id, date) {
  const cleanTitle = title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  return `${date}-${cleanTitle}-${id}`;
}
