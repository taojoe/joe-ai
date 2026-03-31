import { formatStory, generateSlug } from '../utils/markdown-formatter.js';

/**
 * 解析 HN 文章项，转为 Markdown
 * @param {object} story - HN API 返回的文章项
 * @returns {object} { slug, markdown, meta }
 */
export function parseStory(story) {
  // 解析日期
  const createdAt = new Date(story.createdAt);
  const dateStr = createdAt.toISOString().slice(0, 10);

  // 生成文件名 slug
  const slug = generateSlug(story.title, story.id, dateStr);

  // 格式化为 Markdown
  const markdown = formatStory({
    title: story.title,
    date: dateStr,
    url: story.url,
    points: story.points,
    author: story.author,
    discussionUrl: story.discussionUrl,
    numComments: story.numComments,
    sourceType: story.sourceType,
    matchedKeyword: story.matchedKeyword
  });

  return {
    slug,
    markdown,
    meta: {
      id: story.id,
      title: story.title,
      date: dateStr,
      url: story.url
    }
  };
}
