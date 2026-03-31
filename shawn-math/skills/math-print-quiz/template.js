import katex from 'katex';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

// Configure marked to prefer breaks or standard behavior
marked.setOptions({ breaks: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Render text containing Markdown and KaTeX cleanly.
 * We extract math blocks first, process markdown, and restore math to prevent marked from mangling LaTeX.
 */
function renderMarkdownWithMath(text, inline = false) {
  if (!text) return '';
  
  const mathItems = [];
  let index = 0;
  
  // Extract display math ($$...$$)
  let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    let rendered = '';
    try { rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }); } 
    catch(e) { rendered = `<span class="katex-error">${math}</span>`; }
    mathItems.push(rendered);
    return `@@MATH_BLOCK_${index++}@@`;
  });

  // Extract inline math ($...$)
  processed = processed.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    let rendered = '';
    try { rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false }); }
    catch(e) { rendered = `<span class="katex-error">${math}</span>`; }
    mathItems.push(rendered);
    return `@@MATH_BLOCK_${index++}@@`;
  });

  // Parse Markdown (inline or block)
  let html = inline ? marked.parseInline(processed) : marked.parse(processed);

  // Restore math
  mathItems.forEach((mathHtml, i) => {
    html = html.replace(`@@MATH_BLOCK_${i}@@`, () => mathHtml);
  });
  
  return html;
}

/**
 * Basic wrapper alias for inline processing parity
 */
function renderMath(text) {
  return renderMarkdownWithMath(text, true);
}

/**
 * Render a formula string to centered KaTeX display
 */
function renderFormula(formula) {
  try {
    // Safely strip leading/trailing $ or $$ if the AI accidentally included them
    const cleanFormula = formula.replace(/^\$\$?/, '').replace(/\$\$?$/, '').trim();
    return katex.renderToString(cleanFormula, { displayMode: true, throwOnError: false });
  } catch (e) {
    console.warn(`KaTeX formula render error: ${formula}`, e.message);
    return `<span class="katex-error">${formula}</span>`;
  }
}

/**
 * Get question type badge
 */
function getTypeBadge(type) {
  const map = {
    'multiple-choice': { class: 'choice', label: '选择题' },
    'short-answer': { class: 'short-answer', label: '简答题' },
    'drawing': { class: 'drawing', label: '画图题' },
  };
  const info = map[type] || { class: 'short-answer', label: type };
  return `<span class="question-type-badge ${info.class}">${info.label}</span>`;
}

/**
 * Render the options for a multiple-choice question
 */
function renderOptions(options) {
  const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
  return `
    <div class="options-grid">
      ${options.map((opt, i) => `
        <div class="option-item">
          <span class="option-letter">${letters[i]}</span>
          <span class="option-content">${renderMath(opt)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render the answer space based on question type
 */
function renderAnswerSpace(question) {
  if (question.type === 'drawing') {
    return '<div class="drawing-grid"></div>';
  }
  if (question.type === 'multiple-choice') {
    return ''; // Options already provide the interaction
  }
  return '<div class="answer-space"></div>';
}

/**
 * Render a single question item
 */
function renderQuestion(question, index) {
  return `
    <div class="question-item">
      <div class="question-header">
        <span class="question-number">${index + 1}</span>
        <span class="question-text">${renderMath(question.question)}</span>
        ${getTypeBadge(question.type)}
      </div>
      ${question.type === 'multiple-choice' ? renderOptions(question.options) : ''}
      ${question.hint ? `<div class="question-hint">${renderMath(question.hint)}</div>` : ''}
      ${renderAnswerSpace(question)}
    </div>
  `;
}

/**
 * Render answer page item
 */
function renderAnswerItem(question, index) {
  const answerDisplay = question.type === 'multiple-choice'
    ? `选项 ${question.answer}`
    : renderMath(question.answer || '');

  return `
    <div class="answer-item">
      <div class="answer-header">
        <span class="answer-number">${index + 1}</span>
        <span class="answer-label">第 ${index + 1} 题</span>
      </div>
      <div class="answer-correct">
        <span class="label">✅ 答案：</span>${answerDisplay}
      </div>
      ${question.explanation ? `
        <div class="answer-explanation">
          <div class="explanation-title">📝 解题过程</div>
          <div class="explanation-content">${renderMarkdownWithMath(question.explanation, false)}</div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Generate the full HTML document
 */
export function generateHTML(data) {
  const cssPath = path.resolve(__dirname, 'styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} - Shawn Math</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>${cssContent}</style>
</head>
<body>

  <!-- ========== Page 1: Knowledge ========== -->
  <div class="page">
    <div class="page-header">
      <span class="title">${data.title}</span>
      ${data.subtitle ? `<span class="subtitle">${data.subtitle}</span>` : ''}
      <span class="page-label">第 1 页 / 知识讲解</span>
    </div>

    <!-- Knowledge Section -->
    <div class="knowledge-section">
      <div class="section-label">📖 知识要点</div>
      <div class="description">${renderMarkdownWithMath(data.knowledge.description, false)}</div>
      
      ${data.knowledge.formulas.map(f => `
        <div class="formula-box">${renderFormula(f)}</div>
      `).join('')}

      ${data.knowledge.keyPoints && data.knowledge.keyPoints.length > 0 ? `
        <ul class="key-points">
          ${data.knowledge.keyPoints.map(p => `<li>${renderMath(p)}</li>`).join('')}
        </ul>
      ` : ''}

      ${data.knowledge.examples && data.knowledge.examples.length > 0 ? `
        ${data.knowledge.examples.map(ex => `
          <div class="example-box">
            <div class="example-label">📌 例题</div>
            <div class="example-content">${renderFormula(ex.expression)}</div>
            ${ex.note ? `<div class="example-note">${renderMath(ex.note)}</div>` : ''}
          </div>
        `).join('')}
      ` : ''}
    </div>

    <div class="page-footer">
      <span class="brand">Shawn Math</span>
      <span class="date">${today}</span>
    </div>
  </div>

  <!-- ========== Page 2: Practice Problems (Part 1) ========== -->
  <div class="page">
    <div class="page-header">
      <span class="title">${data.title}</span>
      ${data.subtitle ? `<span class="subtitle">${data.subtitle}</span>` : ''}
      <span class="page-label">第 2 页 / 练习题</span>
    </div>

    <!-- Questions Section P1 -->
    <div class="questions-section">
      <div class="section-divider">
        <span class="label">✏️ 练习题 (1)</span>
      </div>
      ${data.questions.slice(0, Math.ceil(data.questions.length / 2)).map((q, i) => renderQuestion(q, i)).join('')}
    </div>
    
    <div class="page-footer">
      <span class="brand">Shawn Math</span>
      <span class="date">${today}</span>
    </div>
  </div>

  <!-- ========== Page 3: Practice Problems (Part 2) ========== -->
  <div class="page">
    <div class="page-header">
      <span class="title">${data.title}</span>
      ${data.subtitle ? `<span class="subtitle">${data.subtitle}</span>` : ''}
      <span class="page-label">第 3 页 / 练习题</span>
    </div>

    <!-- Questions Section P2 -->
    <div class="questions-section">
      <!-- Continue Index -->
      ${data.questions.slice(Math.ceil(data.questions.length / 2)).map((q, i) => renderQuestion(q, i + Math.ceil(data.questions.length / 2))).join('')}
    </div>
    
    <div class="page-footer">
      <span class="brand">Shawn Math</span>
      <span class="date">${today}</span>
    </div>
  </div>

  <!-- ========== Page 4: Answers & Explanations ========== -->
  <div class="page">
    <div class="answer-page-header">
      <span class="title">✅ 答案与解析</span>
      <span class="subtitle">${data.title}</span>
      <span class="page-label">第 4 页 / 答案页</span>
    </div>

    ${data.questions.map((q, i) => renderAnswerItem(q, i)).join('')}

    <div class="page-footer">
      <span class="brand">Shawn Math</span>
      <span class="date">${today}</span>
    </div>
  </div>

</body>
</html>`;
}
