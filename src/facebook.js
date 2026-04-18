import { config } from './config.js';

function buildUrl(edge) {
  return `https://graph.facebook.com/${config.graphApiVersion}/${config.pageId}/${edge}`;
}

function toFacebookError(payload, status) {
  if (payload?.error) {
    const error = new Error(payload.error.message || 'Facebook Graph API request failed');
    error.code = payload.error.code;
    error.type = payload.error.type;
    error.subcode = payload.error.error_subcode;
    error.fbtraceId = payload.error.fbtrace_id;
    error.status = status;
    return error;
  }

  const error = new Error(`Facebook Graph API request failed with status ${status}`);
  error.status = status;
  return error;
}

async function postForm(edge, formData) {
  const response = await fetch(buildUrl(edge), {
    method: 'POST',
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw toFacebookError(payload, response.status);
  }

  return payload;
}

export async function publishProduct(product, message) {
  if (product.images.length > 1) {
    const mediaIds = [];

    for (const imageUrl of product.images) {
      const uploadForm = new FormData();
      uploadForm.append('access_token', config.pageAccessToken);
      uploadForm.append('url', imageUrl);
      uploadForm.append('published', 'false');
      const uploadPayload = await postForm('photos', uploadForm);
      mediaIds.push(uploadPayload.id);
    }

    const feedForm = new FormData();
    feedForm.append('access_token', config.pageAccessToken);
    feedForm.append('message', message);
    mediaIds.forEach((mediaId, index) => {
      feedForm.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: mediaId }));
    });

    const payload = await postForm('feed', feedForm);
    return {
      endpoint: 'feed',
      facebookPostId: payload.id || null,
      facebookObjectId: payload.id || null,
      raw: payload
    };
  }

  const formData = new FormData();
  formData.append('access_token', config.pageAccessToken);

  if (product.images[0]) {
    formData.append('url', product.images[0]);
    formData.append('caption', message);
    const payload = await postForm('photos', formData);
    return {
      endpoint: 'photos',
      facebookPostId: payload.post_id || payload.id || null,
      facebookObjectId: payload.id || null,
      raw: payload
    };
  }

  formData.append('message', message);
  const payload = await postForm('feed', formData);
  return {
    endpoint: 'feed',
    facebookPostId: payload.id || null,
    facebookObjectId: payload.id || null,
    raw: payload
  };
}
