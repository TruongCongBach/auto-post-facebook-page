function timestamp() {
  return new Date().toISOString();
}

function serialize(meta) {
  if (!meta) {
    return '';
  }

  return ` ${JSON.stringify(meta)}`;
}

export const logger = {
  info(message, meta) {
    console.log(`[${timestamp()}] INFO ${message}${serialize(meta)}`);
  },
  warn(message, meta) {
    console.warn(`[${timestamp()}] WARN ${message}${serialize(meta)}`);
  },
  error(message, meta) {
    console.error(`[${timestamp()}] ERROR ${message}${serialize(meta)}`);
  }
};
