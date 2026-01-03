import messages from './messages/zh-TW.json';

export type MessageVariables = Record<string, string | number>;

function resolveMessage(key: string): string {
  const parts = key.split('.');
  let value: unknown = messages;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

function interpolate(message: string, variables?: MessageVariables): string {
  if (!variables) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    return value === undefined ? match : String(value);
  });
}

export function translate(key: string, variables?: MessageVariables): string {
  return interpolate(resolveMessage(key), variables);
}

export { messages };
