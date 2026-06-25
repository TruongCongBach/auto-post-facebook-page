import { config } from './config.js';
import { logger, formatDateTime } from './logger.js';

function decodeJwtExpiry(token) {
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    return {
      role: payload.role,
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : null
    };
  } catch {
    return null;
  }
}

async function checkSupabase() {
  const jwt = decodeJwtExpiry(config.supabaseKey);
  if (!jwt) {
    logger.warn('Supabase: không đọc được JWT (key không phải dạng JWT?)');
  } else if (jwt.expiresAt) {
    const expired = jwt.expiresAt.getTime() <= Date.now();
    const meta = { role: jwt.role, expiresAt: formatDateTime(jwt.expiresAt) };
    if (expired) {
      logger.error('Supabase key đã HẾT HẠN', meta);
    } else {
      logger.success('Supabase key còn hạn', meta);
    }
  }

  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`
      }
    });

    if (response.ok) {
      logger.success('Supabase REST phản hồi OK', { status: response.status });
    } else {
      logger.error('Supabase REST từ chối key', { status: response.status });
    }
  } catch (error) {
    logger.error('Supabase REST không gọi được', { reason: error.message });
  }
}

async function checkFacebook() {
  const base = `https://graph.facebook.com/${config.graphApiVersion}`;
  const token = encodeURIComponent(config.pageAccessToken);

  try {
    const response = await fetch(`${base}/debug_token?input_token=${token}&access_token=${token}`);
    const body = await response.json();

    if (body.error) {
      logger.error('Facebook token KHÔNG hợp lệ', { reason: body.error.message });
      return;
    }

    const data = body.data || {};
    const expiresAt = data.expires_at ? new Date(data.expires_at * 1000) : null;
    const dataExpiresAt = data.data_access_expires_at ? new Date(data.data_access_expires_at * 1000) : null;

    if (!data.is_valid) {
      logger.error('Facebook token KHÔNG hợp lệ', { type: data.type });
      return;
    }

    logger.success('Facebook token còn hạn', {
      type: data.type,
      appId: data.app_id,
      expiresAt: expiresAt ? formatDateTime(expiresAt) : 'không hết hạn',
      dataAccessExpiresAt: dataExpiresAt ? formatDateTime(dataExpiresAt) : null,
      scopes: data.scopes
    });
  } catch (error) {
    logger.error('Facebook không gọi được', { reason: error.message });
  }
}

async function checkGemini() {
  if (!config.geminiApiKey) {
    logger.warn('Gemini: chưa cấu hình GEMINI_API_KEY, bỏ qua');
    return;
  }

  const apiBase = 'https://generativelanguage.googleapis.com/v1beta';
  const headers = { 'x-goog-api-key': config.geminiApiKey };

  // Liệt kê models để xác thực key (không tốn quota generateContent).
  try {
    const response = await fetch(`${apiBase}/models`, { headers });
    if (response.status === 200) {
      logger.success('Gemini API key hợp lệ', { model: config.geminiModel });
    } else if (response.status === 400 || response.status === 403) {
      const body = await response.json().catch(() => ({}));
      logger.error('Gemini API key KHÔNG hợp lệ', { status: response.status, reason: body.error?.message });
      return;
    } else {
      logger.warn('Gemini phản hồi bất thường khi xác thực key', { status: response.status });
    }
  } catch (error) {
    logger.error('Gemini không gọi được', { reason: error.message });
    return;
  }

  // Thử generateContent để phát hiện vấn đề quota/model.
  try {
    const response = await fetch(`${apiBase}/models/${config.geminiModel}:generateContent`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
    });
    const body = await response.json().catch(() => ({}));

    if (response.status === 200) {
      logger.success('Gemini generateContent hoạt động', { model: config.geminiModel });
    } else if (response.status === 429) {
      logger.warn('Gemini key hợp lệ nhưng đã HẾT QUOTA cho model này', {
        model: config.geminiModel,
        reason: body.error?.status
      });
    } else if (response.status === 404) {
      logger.warn('Gemini model không tồn tại / không hỗ trợ generateContent', { model: config.geminiModel });
    } else {
      logger.error('Gemini generateContent lỗi', { status: response.status, reason: body.error?.message });
    }
  } catch (error) {
    logger.error('Gemini generateContent không gọi được', { reason: error.message });
  }
}

async function main() {
  logger.info('Bắt đầu kiểm tra token trong .env');
  await checkSupabase();
  await checkFacebook();
  await checkGemini();
  logger.info('Hoàn tất kiểm tra');
}

main().catch((error) => {
  logger.error('Lỗi khi chạy check-tokens', { reason: error.message });
  process.exitCode = 1;
});
