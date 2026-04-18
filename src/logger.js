function timestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

function serialize(meta) {
  if (!meta) {
    return '';
  }

  return ` | ${JSON.stringify(meta)}`;
}

function write(method, symbol, message, meta) {
  method(`${symbol} ${timestamp()} ${message}${serialize(meta)}`);
}

export const logger = {
  info(message, meta) {
    write(console.log, '•', message, meta);
  },
  warn(message, meta) {
    write(console.warn, '⚠️', message, meta);
  },
  success(message, meta) {
    write(console.log, '✅', message, meta);
  },
  error(message, meta) {
    write(console.error, '❌', message, meta);
  }
};
