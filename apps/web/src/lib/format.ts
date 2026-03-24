export const formatScore = (value: number) => value.toFixed(1);

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const formatDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const parseRationale = (value: string) => {
  const parts = value.split('\n').map((item) => item.trim()).filter(Boolean);
  const findPart = (label: string) =>
    parts.find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`))?.split(':').slice(1).join(':').trim() ?? '';

  return {
    whyExists: findPart('Why this exists'),
    whyPriority: findPart('Why this priority'),
    businessOutcome: findPart('Business outcome'),
  };
};
