export function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

function timestamp() {
  return formatDateTime();
}

function formatDetailValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : null;
  }

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function serialize(details) {
  if (!details) {
    return '';
  }

  if (typeof details === 'string') {
    return `\n   - ${details}`;
  }

  if (Array.isArray(details)) {
    const lines = details
      .map((item) => formatDetailValue(item))
      .filter(Boolean)
      .map((item) => `   - ${item}`);

    return lines.length ? `\n${lines.join('\n')}` : '';
  }

  const lines = Object.entries(details)
    .map(([label, value]) => {
      const formattedValue = formatDetailValue(value);
      return formattedValue ? `   - ${label}: ${formattedValue}` : null;
    })
    .filter(Boolean);

  return lines.length ? `\n${lines.join('\n')}` : '';
}

function write(method, symbol, message, details) {
  method(`${symbol} ${timestamp()} ${message}${serialize(details)}`);
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
