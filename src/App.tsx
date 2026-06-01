import { useState, useMemo, useEffect, useCallback } from 'react';
import { MapView } from './components/MapView';
import { EventList } from './components/EventList';
import { EventDetail } from './components/EventDetail';
import { FilterBar } from './components/FilterBar';
import { fetchApiEvents } from './api/events';
import { geocodeAddresses } from './utils/geocode';
import { resolveAddress, resolvePrefecture } from './utils/address';
import type { TournamentEvent, EventType } from './types';
import { EVENT_TYPE_LABELS, mapEventType } from './types';

const ALL_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export function App() {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set(ALL_TYPES));
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const apiEvents = await fetchApiEvents();

        if (cancelled) return;

        // 住所を一覧化（重複排除）。place_address が空の場合は address1+address2 を使う
        const addresses = [...new Set(apiEvents.map(resolveAddress).filter(Boolean))];

        setLoading(false);
        setGeocoding(true);

        const coords = await geocodeAddresses(addresses, (done, total) => {
          if (!cancelled) setGeocodeProgress({ done, total });
        });

        if (cancelled) return;

        const failed: typeof apiEvents = [];
        const mapped: TournamentEvent[] = apiEvents
          .flatMap(e => {
            const addr = resolveAddress(e);
            const latlng = coords[addr];
            if (!latlng) {
              failed.push(e);
              return [];
            }
            const event: TournamentEvent = {
              id: String(e.id),
              name: e.name ?? e.event_type_open_name,
              type: mapEventType(e),
              date: e.start_date.split(' ')[0],
              venue: e.place_name || e.shop_name,
              address: addr,
              prefecture: resolvePrefecture(e),
              lat: latlng.lat,
              lng: latlng.lng,
              price: e.price ?? undefined,
              capacity: e.capacity,
              shikaku: e.shikaku ?? undefined,
              annai: e.annai,
              detailUrl: e.detail_link_url ?? undefined,
            };
            return [event];
          });

        console.info(
          `[BBX Map] 取得: ${apiEvents.length} 件 / 表示: ${mapped.length} 件 / 失敗: ${failed.length} 件`,
        );
        if (failed.length > 0) {
          console.warn(
            '[BBX Map] 地図に表示できなかったイベント:',
            failed.map(e => ({
              id: e.id,
              name: e.name ?? e.event_type_open_name,
              resolvedAddress: resolveAddress(e),
              place_address: e.place_address,
              address1: e.address1,
              address2: e.address2,
            })),
          );
        }

        setEvents(mapped);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setGeocoding(false);
          setGeocodeProgress(null);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(e => {
      if (!activeTypes.has(e.type)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.prefecture.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q)
      );
    });
  }, [events, activeTypes, query]);

  const selectedEvent = selectedId ? events.find(e => e.id === selectedId) ?? null : null;

  const handleSelect = useCallback((event: TournamentEvent) => {
    setSelectedId(event.id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const toggleType = useCallback((type: EventType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const isInitializing = loading || geocoding;

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="app-header__menu"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="メニューを開く"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <div className="app-header__title">
          <span className="app-header__logo">⚡</span>
          <span>BBX 大会マップ</span>
        </div>
        <a
          className="app-header__official"
          href="https://beyblade.takaratomy.co.jp/beyblade-x/event/schedule.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          公式スケジュール ↗
        </a>
      </header>

      <div className="app-body">
        {/* ローディングオーバーレイ（app-body全体を覆う） */}
        {isInitializing && (
          <div className="loading-overlay">
            <div className="loading-box">
              <div className="loading-spinner" />
              <p className="loading-title">
                {loading ? '大会データを取得中…' : '地図情報を取得中…'}
              </p>
              {geocoding && geocodeProgress && (
                <>
                  <p className="loading-progress">
                    {geocodeProgress.done} / {geocodeProgress.total} 件
                  </p>
                  <div className="loading-bar">
                    <div
                      className="loading-bar__fill"
                      style={{
                        width: `${(geocodeProgress.done / geocodeProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
          <FilterBar
            activeTypes={activeTypes}
            onToggle={toggleType}
            query={query}
            onQueryChange={setQuery}
          />
          <div className="sidebar__count">
            {isInitializing ? '読み込み中…' : `${filteredEvents.length} 件の大会`}
          </div>
          <EventList
            events={filteredEvents}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </aside>

        <main className="map-wrapper">
          <MapView
            events={filteredEvents}
            selectedId={selectedId}
            onSelect={handleSelect}
          />

          {/* エラー表示 */}
          {error && !isInitializing && (
            <div className="error-overlay">
              <div className="error-box">
                <p className="error-box__title">データの取得に失敗しました</p>
                <p className="error-box__msg">{error}</p>
                <button className="error-box__retry" onClick={() => window.location.reload()}>
                  再試行
                </button>
              </div>
            </div>
          )}

          {/* 詳細パネル */}
          {selectedEvent && !isInitializing && (
            <div className="detail-overlay">
              <EventDetail
                event={selectedEvent}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
