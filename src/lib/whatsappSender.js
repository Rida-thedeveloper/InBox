export const getWhatsAppContactName = (sender) => {
  if (typeof sender !== 'string') return null;
  const name = sender.trim();
  if (!name) return null;

  const digitsOnly = name.replace(/\D/g, '');
  const isUuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(name);
  const isWhatsAppId = /@(?:s\.whatsapp\.net|g\.us|lid)$/i.test(name);
  const isNumericId = digitsOnly.length >= 7 && /^[+\d\s().-]+$/.test(name);
  const isOpaqueId = /^[\da-f]{16,}$/i.test(name) || /^(?:wa|whatsapp|user|contact)[_:-][\w-]{6,}$/i.test(name);

  return isUuid || isWhatsAppId || isNumericId || isOpaqueId ? null : name;
};

const DATE_MENTION_PATTERN = /\b(?:today|tomorrow|tonight|next week|this week|(?:this|next)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+\d{4})?\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi;
const TIME_MENTION_PATTERN = /\b(?:at|by|before|around)?\s*(?:(?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)|(?:[01]?\d|2[0-3]):[0-5]\d)\b/gi;

const formatMentionedTime = (time) => {
  const match = time.match(/(?:at|by|before|around)?\s*((?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*[ap]\.?m\.?|(?:[01]?\d|2[0-3]):[0-5]\d)/i);
  return match ? match[1].replace(/\s+/g, ' ').replace(/\./g, '').toUpperCase() : time.trim();
};

export const extractWhatsAppDateTimeMention = (description, originalMessage) => {
  const body = [description, originalMessage].filter((value) => typeof value === 'string').join(' ');
  if (!body) return null;

  const dateMention = body.match(DATE_MENTION_PATTERN)?.[0]?.replace(/[,.]+$/, '');
  const timeMention = body.match(TIME_MENTION_PATTERN)?.[0];
  if (dateMention && timeMention) return `${dateMention} · ${formatMentionedTime(timeMention)}`;
  if (dateMention) return dateMention;
  if (timeMention) return formatMentionedTime(timeMention);
  return null;
};

export const getWhatsAppScheduleLabel = (date, time, description, originalMessage) => {
  const dateLabel = typeof date === 'string' && date
    ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const timeLabel = typeof time === 'string' && time
    ? (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(time) ? formatMentionedTime(time) : time)
    : null;

  if (dateLabel || timeLabel) return [dateLabel, timeLabel].filter(Boolean).join(' · ');
  return extractWhatsAppDateTimeMention(description, originalMessage) || 'No deadline provided';
};
