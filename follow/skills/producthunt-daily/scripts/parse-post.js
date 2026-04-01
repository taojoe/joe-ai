/**
 * 解析并生成 Markdown 产物
 * 调整为支持本地图片路径
 */
export function parsePost(post, dateStr) {
  const {
    id,
    name,
    tagline,
    description,
    url,
    website,
    votesCount,
    slug,
    thumbnail,
    media,
    topics,
    makers
  } = post;

  const imageTasks = [];
  
  // 提取主题
  const topicList = topics?.edges?.map(e => e.node.name) || [];
  
  // 提取制作者
  const makerList = makers?.map(m => `${m.name} (@${m.username})`) || [];

  // 判断是否包含一些常见的 AI 关键词 (为后续筛选提供便利)
  const aiKeywords = ['ai', 'llm', 'gpt', 'chat', 'agent', 'bot', 'machine learning', 'nlp', 'claude', 'gemini', 'openai'];
  const hasAiSignals = aiKeywords.some(k => 
    name.toLowerCase().includes(k) || 
    tagline.toLowerCase().includes(k) ||
    description?.toLowerCase().includes(k)
  );

  // 1. 处理 Thumbnail
  let localThumbPath = '';
  if (thumbnail?.url) {
    const ext = thumbnail.url.split('?')[0].split('.').pop() || 'png';
    const fileName = `thumb.${ext}`;
    localThumbPath = `images/${fileName}`;
    imageTasks.push({ url: thumbnail.url, localName: fileName });
  }

  // 2. 处理 Media
  const processedMedia = [];
  if (media && media.length > 0) {
    media.forEach((m, index) => {
      if (m.type === 'image') {
        const ext = m.url.split('?')[0].split('.').pop() || 'png';
        const fileName = `media-${index}.${ext}`;
        const localPath = `images/${fileName}`;
        imageTasks.push({ url: m.url, localName: fileName });
        processedMedia.push({ ...m, localPath });
      } else if (m.type === 'video') {
        processedMedia.push(m); // 视频暂不下载，保留链接
      }
    });
  }

  // 组装 YAML Frontmatter
  let markdown = `---\n`;
  markdown += `id: "${id}"\n`;
  markdown += `title: "${name.replace(/"/g, '\\"')}"\n`;
  markdown += `tagline: "${tagline.replace(/"/g, '\\"')}"\n`;
  markdown += `votes: ${votesCount}\n`;
  markdown += `url: "${url}"\n`;
  markdown += `website: "${website || ''}"\n`;
  markdown += `date: "${dateStr}"\n`;
  markdown += `topics: ${JSON.stringify(topicList)}\n`;
  markdown += `makers: ${JSON.stringify(makerList)}\n`;
  markdown += `is_ai: ${hasAiSignals}\n`;
  markdown += `---\n\n`;

  // 正文部分
  markdown += `# ${name} (${dateStr})\n\n`;
  markdown += `> ${tagline}\n\n`;

  if (localThumbPath) {
    markdown += `![Thumbnail](${localThumbPath})\n\n`;
  }

  markdown += `## Description\n${description || 'No description provided.'}\n\n`;

  markdown += `## Metadata\n`;
  markdown += `- **Votes**: ${votesCount}\n`;
  markdown += `- **Product Hunt**: [Link](${url})\n`;
  markdown += `- **Website**: ${website ? `[Official Website](${website})` : 'N/A'}\n`;
  markdown += `- **Topics**: ${topicList.join(', ') || 'N/A'}\n`;
  markdown += `- **Makers**: ${makerList.length > 0 ? makerList.join('; ') : 'N/A'}\n\n`;

  if (processedMedia.length > 0) {
    markdown += `## Media\n`;
    for (const m of processedMedia) {
      if (m.type === 'video') {
         if (m.videoUrl) markdown += `- [Video](${m.videoUrl})\n`;
      } else if (m.type === 'image') {
         markdown += `![Image](${m.localPath || m.url})\n`;
      }
    }
    markdown += `\n`;
  }

  return {
    slug,
    markdown,
    imageTasks,
    meta: {
      title: name,
      tagline,
      votes: votesCount
    }
  };
}
