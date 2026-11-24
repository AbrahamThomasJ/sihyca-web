export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

export const isoDate = (date: Date) => date.toISOString();
