import xss from 'xss';

const xssOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

export function sanitizeText(input: string): string {
  return xss(input.trim(), xssOptions);
}

export function sanitizeOptionalText(input: string | null | undefined): string | null {
  if (input == null || input === '') return null;
  return sanitizeText(input);
}
