import { useState, useMemo, useEffect, useCallback } from 'react';
import { MapView } from './components/MapView';
import { EventList } from './components/EventList';
import { EventDetail } from './components/EventDetail';
import { FilterBar } from './components/FilterBar';
import { fetchApiEvents } from './api/events';
import { geocodeAddresses } from './utils/geocode';
import { resolveAddress, resolvePrefecture } from './utils/address';
import type { TournamentEvent, AgeCategory, TournamentGrade } from './types';
import { mapEventType, mapAgeCategory, mapTournamentGrade } from './types';

const ALL_GRADES: TournamentGrade[] = ['G3', 'G2', 'G1', 'S1', 'other'];

export function App() {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 同座標の複数イベントをまとめて右パネルに表示するためのグループ
  const [panelEvents, setPanelEvents] = useState<TournamentEvent[]>([]);
  const [activeAgeCategories, setActiveAgeCategories] = useState<Set<AgeCategory>>(new Set(['open']));
  const [activeGrades, setActiveGrades] = useState<Set<TournamentGrade>>(new Set(ALL_GRADES));
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

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
              ageCategory: mapAgeCategory(e),
              grade: mapTournamentGrade(e),
              startDate: e.start_date,
              venue: e.place_name || e.shop_name,
              address: addr,
              prefecture: resolvePrefecture(e),
              lat: latlng.lat,
              lng: latlng.lng,
              uketsuke: e.uketsuke,
              price: e.price ?? undefined,
              capacity: e.capacity || undefined,
              shikaku: e.shikaku || undefined,
              houhou: e.houhou ?? undefined,
              annai: e.annai || undefined,
              media: e.media ?? undefined,
              keishiki: e.keishiki || undefined,
              motimono: e.motimono || undefined,
              tyuui: e.tyuui ?? undefined,
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
      if (!activeAgeCategories.has(e.ageCategory)) return false;
      if (!activeGrades.has(e.grade)) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.prefecture.toLowerCase().includes(q) ||
        e.address.toLowerCase().includes(q)
      );
    });
  }, [events, activeAgeCategories, activeGrades, query]);

  const [flyZoom, setFlyZoom] = useState(false);

  const handleSelect = useCallback((event: TournamentEvent, zoom = false) => {
    setFlyZoom(zoom);
    setSelectedId(event.id);
    const lat = event.lat.toFixed(5);
    const lng = event.lng.toFixed(5);
    const group = events.filter(
      e => e.lat.toFixed(5) === lat && e.lng.toFixed(5) === lng,
    );
    setPanelEvents(group.length > 0 ? group : [event]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [events]);

  const toggleAge = useCallback((cat: AgeCategory) => {
    setActiveAgeCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleGrade = useCallback((grade: TournamentGrade) => {
    setActiveGrades(prev => {
      const next = new Set(prev);
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
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

        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
          <FilterBar
            activeAgeCategories={activeAgeCategories}
            onToggleAge={toggleAge}
            activeGrades={activeGrades}
            onToggleGrade={toggleGrade}
            query={query}
            onQueryChange={setQuery}
          />
          <div className="sidebar__count">
            {isInitializing ? '読み込み中…' : `${filteredEvents.length} 件の大会`}
          </div>
          <EventList
            events={filteredEvents}
            selectedId={selectedId}
            onSelect={e => handleSelect(e, true)}
          />
        </aside>

        <main className="map-wrapper">
          <MapView
            events={filteredEvents}
            selectedId={selectedId}
            onSelect={handleSelect}
            flyZoom={flyZoom}
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
        </main>

        {/* 大会詳細パネル（同座標の複数イベントに対応） */}
        {selectedId && panelEvents.length > 0 && (
          <aside className="detail-panel">
            {panelEvents.length > 1 && (
              <div className="detail-panel__header">
                <div className="detail-panel__meta">
                  <span className="detail-panel__title">{panelEvents.length} 件の大会</span>
                  <span className="detail-panel__venue">
                    {panelEvents[0].prefecture} · {panelEvents[0].venue}
                  </span>
                  <span className="detail-panel__address">{panelEvents[0].address}</span>
                  <a
                    className="detail-panel__maps-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(panelEvents[0].address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Maps ↗
                  </a>
                </div>
                <button
                  className="detail-panel__close"
                  onClick={() => { setSelectedId(null); setPanelEvents([]); }}
                  aria-label="閉じる"
                >✕</button>
              </div>
            )}
            <div className="detail-panel__scroll">
              {panelEvents.map((ev, i) => (
                <div key={ev.id} className={i > 0 ? 'detail-panel__divider' : ''}>
                  <EventDetail
                    event={ev}
                    onClose={() => { setSelectedId(null); setPanelEvents([]); }}
                    hideVenue={panelEvents.length > 1}
                  />
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
