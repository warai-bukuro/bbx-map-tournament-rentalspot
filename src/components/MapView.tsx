import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const canvasRenderer = L.canvas({ padding: 0.5 });
const isMobile = window.innerWidth < 768;
import type { TournamentEvent } from '../types';
import { getBadgeColor, getBadgeLabel } from '../types';
import { formatDate, formatTime } from '../utils/date';
import { linkify } from '../utils/linkify';


/** グループ内で直近（または最後）のイベントを返す */
function nearestEvent(group: TournamentEvent[]): TournamentEvent {
  const now = Date.now();
  const sorted = [...group].sort(
    (a, b) => new Date(a.startDate.replace(/\//g, '-')).getTime()
            - new Date(b.startDate.replace(/\//g, '-')).getTime(),
  );
  return sorted.find(
    e => new Date(e.startDate.replace(/\//g, '-')).getTime() >= now,
  ) ?? sorted[sorted.length - 1];
}

/** グループ内で直近の startDate を "M/D" 形式で返す */
function nearestDate(group: TournamentEvent[]): string {
  const d = new Date(nearestEvent(group).startDate.replace(/\//g, '-'));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}


interface Props {
  events: TournamentEvent[];
  selectedId: string | null;
  onSelect: (event: TournamentEvent) => void;
  flyZoom: boolean;
}

/** lat/lng を固定小数点文字列にして同座標グループのキーにする */
function locKey(e: TournamentEvent) {
  return `${e.lat.toFixed(5)},${e.lng.toFixed(5)}`;
}

function FlyToSelected({ events, selectedId, flyZoom }: { events: TournamentEvent[]; selectedId: string | null; flyZoom: boolean }) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || selectedId === prevId.current) return;
    const event = events.find(e => e.id === selectedId);
    if (event) {
      if (flyZoom) {
        map.flyTo([event.lat, event.lng], 14, { duration: 0.8 });
      } else {
        map.panTo([event.lat, event.lng], { animate: true, duration: 0.5 });
      }
      prevId.current = selectedId;
    }
  }, [selectedId, events, map, flyZoom]);

  return null;
}

function LocateButton() {
  const map = useMap();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  function handleLocate() {
    if (!navigator.geolocation) { setStatus('error'); return; }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1 }); setStatus('idle'); },
      () => setStatus('error'),
      { timeout: 8000 },
    );
  }

  const label = status === 'loading' ? '…' : status === 'error' ? '✕' : '⊕';
  const title = status === 'error' ? '位置情報を取得できませんでした' : '現在地に移動';

  return (
    <button
      className={`locate-btn${status === 'error' ? ' locate-btn--error' : ''}`}
      onClick={handleLocate} title={title} aria-label={title}
    >
      {label}
    </button>
  );
}

const MAP_POS_KEY = 'bbx_map_pos';

function saveMapPos(map: ReturnType<typeof useMap>) {
  const c = map.getCenter();
  sessionStorage.setItem(MAP_POS_KEY, JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() }));
}

function InitialLocate() {
  const map = useMap();
  const done = useRef(false);

  // 地図移動時に位置を保存
  useMapEvents({
    moveend() { saveMapPos(map); },
    zoomend() { saveMapPos(map); },
  });

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // 保存済みの位置があれば復元
    const saved = sessionStorage.getItem(MAP_POS_KEY);
    if (saved) {
      const { lat, lng, zoom } = JSON.parse(saved);
      map.setView([lat, lng], zoom, { animate: false });
      return;
    }

    // 初回のみ現在地へ移動
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => map.setView([pos.coords.latitude, pos.coords.longitude], 10),
      () => {},
      { timeout: 5000 },
    );
  }, [map]);

  return null;
}

function PopupDetail({ event, onSelect }: { event: TournamentEvent; onSelect: (e: TournamentEvent) => void }) {
  const time = formatTime(event.startDate);
  return (
    <div className="popup-detail">
      <p className="popup-detail__row">
        <span className="popup-detail__key">開催日</span>
        {formatDate(event.startDate)}{time && `　${time}`}
      </p>
      <p className="popup-detail__row">
        <span className="popup-detail__key">当日受付</span>
        {event.uketsuke ? 'あり' : 'なし'}
      </p>
      {event.price && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">参加費</span>{event.price}
        </p>
      )}
      {event.capacity && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">定員</span>{event.capacity} 名
        </p>
      )}
      {event.shikaku && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">参加資格</span>{linkify(event.shikaku)}
        </p>
      )}
      {event.media && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">参加方法</span>{linkify(event.media)}
        </p>
      )}
      {event.annai && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">告知媒体</span>{linkify(event.annai)}
        </p>
      )}
      {event.keishiki && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">大会形式</span>{linkify(event.keishiki)}
        </p>
      )}
      {event.motimono && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">持ち物</span>{linkify(event.motimono)}
        </p>
      )}
      {event.tyuui && (
        <p className="popup-detail__row">
          <span className="popup-detail__key">お知らせ</span>{linkify(event.tyuui)}
        </p>
      )}
      <div className="popup-detail__actions">
        <button
          className="popup-detail__link popup-detail__link--panel"
          onClick={e => { e.stopPropagation(); onSelect(event); }}
        >
          右パネルで開く
        </button>
        <a
          className="popup-detail__link popup-detail__link--official"
          href={`https://beyblade.takaratomy.co.jp/beyblade-x/shop_event/manage/open_detail_all.html?id=${event.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
        >
          公式詳細 ↗
        </a>
        {event.detailUrl && (
          <a
            className="popup-detail__link"
            href={event.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
          >
            公式ページ ↗
          </a>
        )}
      </div>
    </div>
  );
}

interface PopupContentProps {
  group: TournamentEvent[];
  first: TournamentEvent;
  onSelect: (e: TournamentEvent) => void;
}

function PopupContent({ group, first, onSelect }: PopupContentProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="map-popup">
      <p className="popup-venue">{first.prefecture} · {first.venue}</p>
      <p className="popup-address">{first.address}</p>
      <a
        className="popup-maps-link"
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(first.address)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Google Maps ↗
      </a>
      {group.length > 1 && (
        <p className="popup-count">{group.length} 件の大会</p>
      )}
      {group.map(event => {
        const expanded = expandedId === event.id;
        return (
          <div
            key={event.id}
            className={`popup-item${expanded ? ' popup-item--expanded' : ''}`}
            onClick={() => setExpandedId(expanded ? null : event.id)}
            role="button"
            tabIndex={0}
            onKeyDown={ev => ev.key === 'Enter' && setExpandedId(expanded ? null : event.id)}
          >
            <div className="popup-item__header">
              <span
                className="popup-badge"
                style={{ background: getBadgeColor(event) }}
              >
                {getBadgeLabel(event)}
              </span>
              <span className="popup-item__chevron">{expanded ? '▲' : '▼'}</span>
            </div>
            <p className="popup-name">{event.name}</p>
            <p className="popup-date">{formatDate(event.startDate)}</p>
            {expanded && <PopupDetail event={event} onSelect={onSelect} />}
          </div>
        );
      })}
    </div>
  );
}

interface MarkersProps {
  groups: TournamentEvent[][];
  selectedId: string | null;
  onSelect: (event: TournamentEvent) => void;
}

function Markers({ groups, selectedId, onSelect }: MarkersProps) {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

  useMapEvents({
    moveend(e) { setBounds(e.target.getBounds()); },
    zoomend(e) { setBounds(e.target.getBounds()); },
    load(e)    { setBounds(e.target.getBounds()); },
  });

  // 初回レンダリング時にも bounds を取得
  const map = useMap();
  useEffect(() => { setBounds(map.getBounds()); }, [map]);

  // 少しマージンを持たせてビューポート外を除外
  const visible = useMemo(() => {
    if (!bounds) return groups;
    const pad = bounds.pad(0.1);
    return groups.filter(g => pad.contains([g[0].lat, g[0].lng]));
  }, [groups, bounds]);

  return (
    <>
      {visible.map(group => {
        const first = group[0];
        const isSelected = group.some(e => e.id === selectedId);
        const fillColor = getBadgeColor(nearestEvent(group));

        return (
          <CircleMarker
            key={locKey(first)}
            center={[first.lat, first.lng]}
            radius={isSelected ? 14 : group.length > 1 ? 12 : 10}
            pathOptions={{
              color: '#111',
              weight: 1.5,
              fillColor,
              fillOpacity: 1,
            }}
            renderer={canvasRenderer}
            eventHandlers={{ click: () => onSelect(first) }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -10]}
              className="marker-label"
            >
              {nearestDate(group)}
            </Tooltip>
            <Popup minWidth={isMobile ? window.innerWidth - 24 : 240} maxHeight={480}>
              <PopupContent
                group={group}
                first={first}
                onSelect={onSelect}
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export function MapView({ events, selectedId, onSelect, flyZoom }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, TournamentEvent[]>();
    for (const e of events) {
      const k = locKey(e);
      const g = map.get(k) ?? [];
      g.push(e);
      map.set(k, g);
    }
    return [...map.values()];
  }, [events]);

  return (
    <MapContainer
      center={[36.2, 138.2]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InitialLocate />
      <FlyToSelected events={events} selectedId={selectedId} flyZoom={flyZoom} />
      <LocateButton />
      <Markers groups={groups} selectedId={selectedId} onSelect={onSelect} />
    </MapContainer>
  );
}
