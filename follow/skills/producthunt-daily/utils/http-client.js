import { logger } from './logger.js';

/**
 * 带有超时和重试机制的 fetch
 * @param {string} url - 请求 URL
 * @param {object} options - Fetch 选项
 * @param {object} config - 重试和超时配置
 * @param {number} config.retries - 最大重试次数 (默认 3)
 * @param {number} config.timeout - 超时时间 (ms, 默认 15000)
 * @param {number} config.retryDelay - 两次重试之间的延迟 (ms, 默认 2000)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, config = {}) {
  const {
    retries = 3,
    timeout = 15000,
    retryDelay = 2000,
  } = config;

  let lastError;

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      if (i > 0) {
        logger.info(`Retry ${i}/${retries} for: ${url}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      return response; // 成功则返回
    } catch (error) {
      lastError = error;
      const isTimeout = error.name === 'AbortError';
      const msg = isTimeout ? 'Timeout' : error.message;
      
      logger.warn(`Fetch failed (${msg}): ${url}`);
      
      if (i === retries) break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}
