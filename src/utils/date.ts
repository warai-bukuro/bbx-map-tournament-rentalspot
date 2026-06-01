/** "2026/06/07 13:00:00"（UTC）→ Date（UTCとして解釈） */
function parseAsUTC(dateStr: string): Date {
  const s = dateStr.replace(/\//g, '-');
  return new Date(s.includes(' ') ? s.replace(' ', 'T') + 'Z' : s + 'T00:00:00Z');
}

/** "2026/06/07 13:00:00"（UTC）→ "2026年6月7日（日）"（JST） */
export function formatDate(dateStr: string): string {
  return parseAsUTC(dateStr).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/** "2026/06/07 04:00:00"（UTC）→ "13:00"（JST） / 時刻なしなら空文字 */
export function formatTime(dateStr: string): string {
  const timePart = dateStr.includes(' ') ? dateStr.split(' ')[1] : '';
  if (!timePart || timePart === '00:00:00') return '';
  const time = parseAsUTC(dateStr).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return time === '00:00' ? '' : time;
}

export function isUpcoming(dateStr: string): boolean {
  const todayJST = new Date(new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  return parseAsUTC(dateStr) >= todayJST;
}
