import { config } from './config.js';
import { truncate } from './utils.js';

function sanitizeInlineText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function buildProductUrl(product) {
  if (!product.url) {
    return config.baseProductUrl;
  }

  if (String(product.url).startsWith('http://') || String(product.url).startsWith('https://')) {
    return String(product.url);
  }

  return `${config.baseProductUrl.replace(/\/+$/, '')}/${String(product.url).replace(/^\/+/, '')}`;
}

function sanitizeMultilineText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[*_`>#]/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeAiCopy(text) {
  return truncate(sanitizeMultilineText(text), 1200);
}

export function buildPostMessage(product, aiCopy) {
  const productName = sanitizeInlineText(product.name || 'Sản phẩm này');
  const productUrl = buildProductUrl(product);
  const lines = [
    normalizeAiCopy(aiCopy),
    '',
    `👉 Xem chi tiết sản phẩm: ${productName}`,
    `🔗 ${productUrl}`,
    '',
    '📍 Xem trực tiếp tại:',
    config.storeAddress,
    `🗺️ Chỉ đường: ${config.storeMapUrl}`,
    '',
    `📞 Hotline/Zalo: ${config.storePhone}`,
    `💬 Zalo: ${config.storeZaloUrl}`,
    '📩 Inbox để được tư vấn nhanh!'
  ];

  return lines.join('\n');
}
