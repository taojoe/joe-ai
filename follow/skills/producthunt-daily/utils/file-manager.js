import { mkdirSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';

/**
 * 确保目录存在，不存在则递归创建
 * @param {string} dirPath - 目录路径
 */
export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

/**
 * 将内容写入文件，如果文件已存在则跳过
 * @param {string} filePath - 文件路径
 * @param {string} content - 文件内容
 * @param {object} options - 选项
 * @param {boolean} options.overwrite - 是否覆盖已存在的文件
 * @returns {boolean} 是否成功写入
 */
export function writeArticle(filePath, content, options = {}) {
  const { overwrite = false } = options;

  if (existsSync(filePath) && !overwrite) {
    logger.skip(`File already exists: ${filePath}`);
    return false;
  }

  writeFileSync(filePath, content, 'utf-8');
  logger.success(`Saved: ${filePath}`);
  return true;
}

/**
 * 下载并保存图片
 * @param {string} url - 图片 URL
 * @param {string} destPath - 目标保存路径
 * @returns {Promise<boolean>} 是否成功
 */
export async function downloadImage(url, destPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    writeFileSync(destPath, buffer);
    return true;
  } catch (error) {
    logger.error(`Download failed: ${url} -> ${error.message}`);
    return false;
  }
}

/**
 * 获取输出目录中已有的子目录列表
 * @param {string} outputDir - 输出目录
 * @returns {string[]} 目录名列表
 */
export function getExistingDirs(outputDir) {
  if (!existsSync(outputDir)) return [];
  return readdirSync(outputDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}
