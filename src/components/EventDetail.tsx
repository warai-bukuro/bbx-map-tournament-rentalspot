import type { TournamentEvent } from '../types';
import { getBadgeLabel, getBadgeColor } from '../types';
import { formatDate, formatTime } from '../utils/date';

interface Props {
  event: TournamentEvent;
  onClose: () => void;
  hideVenue?: boolean;
}

function Section({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="ed-section">
      <p className="ed-section__label">{label}</p>
      <p className="ed-section__value">{value}</p>
    </div>
  );
}

export function EventDetail({ event, onClose, hideVenue = false }: Props) {
  const color = getBadgeColor(event);
  const label = getBadgeLabel(event);
  const time = formatTime(event.startDate);

  return (
    <div className="event-detail">
      <div className="event-detail__bar" style={{ background: color }} />

      <div className="event-detail__content">
        <button className="event-detail__close" onClick={onClose} aria-label="閉じる">✕</button>

        {/* ヘッダー */}
        <div className="ed-header">
          <p className="ed-header__date">
            {formatDate(event.startDate)}
            {time && <span className="ed-header__time">　{time}</span>}
          </p>
          <span className="ed-header__badge" style={{ background: color }}>
            {label}
          </span>
          <p className="ed-header__uketsuke">
            当日受付：{event.uketsuke ? 'あり' : 'なし'}
          </p>
          {event.price && <p className="ed-header__price">参加費：{event.price}</p>}
        </div>

        <h2 className="ed-name">{event.name}</h2>

        {event.capacity && (
          <p className="ed-capacity">定員数 {event.capacity} 名</p>
        )}

        <Section label="参加資格" value={event.shikaku} />

        {/* 会場（複数イベント時は親が共通表示するので非表示） */}
        {!hideVenue && (
          <div className="ed-section">
            <p className="ed-section__label">会場</p>
            <p className="ed-section__value">{event.venue}</p>
            <p className="ed-section__sub">{event.address}</p>
          </div>
        )}

        <Section label="参加方法" value={event.houhou} />
        <Section label="告知媒体" value={event.media} />
        <Section label="大会形式" value={event.keishiki} />
        <Section label="持ち物" value={event.motimono} />
        <Section label="お知らせ" value={event.tyuui} />

        {/* リンク（Google Mapsは複数イベント時は共通ヘッダーに表示） */}
        <div className="ed-actions">
          <a
            className="ed-btn ed-btn--official"
            href={`https://beyblade.takaratomy.co.jp/beyblade-x/shop_event/manage/open_detail_all.html?id=${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            公式詳細 ↗
          </a>
          {event.detailUrl && (
            <a
              className="ed-btn ed-btn--primary"
              href={event.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              公式ページ ↗
            </a>
          )}
          {!hideVenue && (
            <a
              className="ed-btn"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Maps ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
