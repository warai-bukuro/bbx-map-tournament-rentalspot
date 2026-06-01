const URL_SPLIT = /(https?:\/\/[^\s]+)/g;
const URL_CHECK = /^https?:\/\//;

export function linkify(text: string) {
  const parts = text.split(URL_SPLIT);
  return parts.map((part, i) =>
    URL_CHECK.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}
