import type { TournamentEvent } from '../types';
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '../types';
import { formatDate } from '../utils/date';

interface Props {
  event: TournamentEvent;
  onClose: () => void;
}

export function EventDetail({ event, onClose }: Props) {
  const color = EVENT_TYPE_COLORS[event.type];

  return (
    <div className="event-detail">
      <div className="event-detail__bar" style={{ background: color }} />
      <div className="event-detail__content">
        <button className="event-detail__close" onClick={onClose} aria-label="閉じる">✕</button>
        <span className="event-detail__badge" style={{ background: color }}>
          {EVENT_TYPE_LABELS[event.type]}
        </span>
        <h2 className="event-detail__name">{event.name}</h2>
        <dl className="event-detail__info">
          <dt>開催日</dt>
          <dd>{formatDate(event.date)}</dd>
          <dt>会場</dt>
          <dd>{event.venue}</dd>
          <dt>住所</dt>
          <dd>{event.address}</dd>
          {event.price && <><dt>参加費</dt><dd>{event.price}</dd></>}
          {event.capacity && <><dt>定員</dt><dd>{event.capacity} 名</dd></>}
          {event.shikaku && <><dt>参加資格</dt><dd>{event.shikaku}</dd></>}
        </dl>
        <div className="event-detail__actions">
          {event.detailUrl && (
            <a
              className="event-detail__link"
              href={event.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              公式ページ ↗
            </a>
          )}
          <a
            className="event-detail__map-link"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Maps ↗
          </a>
        </div>
        {event.annai && <p className="event-detail__note">{event.annai}</p>}
      </div>
    </div>
  );
}
