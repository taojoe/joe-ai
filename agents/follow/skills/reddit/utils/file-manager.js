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
  return true;
}

/**
 * 获取输出目录中已有的文件列表
 * @param {string} outputDir - 输出目录
 * @returns {string[]} 文件名列表
 */
export function getExistingFiles(outputDir) {
  if (!existsSync(outputDir)) return [];
  return readdirSync(outputDir).filter((f) => f.endsWith('.md'));
}
