import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FilterIcon, MenuIcon } from "./components/Icons";
import { MapView } from './components/MapView';
import { EventList } from './components/EventList';
import { EventDetail } from './components/EventDetail';
import { FilterBar } from './components/FilterBar';
import { fetchApiEvents } from './api/events';
import { geocodeAddresses, isCachedAddresses } from './utils/geocode';
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
  const [activeAgeCategories, setActiveAgeCategories] = useState<Set<AgeCategory>>(new Set(['open']));
  const [activeGrades, setActiveGrades] = useState<Set<TournamentGrade>>(new Set(ALL_GRADES));
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  const isFirstLoad = useRef(true);
  const currentLoadId = useRef(0);

  const load = useCallback(async () => {
    const loadId = ++currentLoadId.current;
    const isCancelled = () => currentLoadId.current !== loadId;

    try {
      setLoading(true);
      setError(null);

      const apiEvents = await fetchApiEvents();

      if (isCancelled()) return;

      const addresses = [...new Set(apiEvents.map(resolveAddress).filter(Boolean))];

      setLoading(false);

      const hasCachedAll = isCachedAddresses(addresses);
      if (!hasCachedAll) {
        setGeocoding(true);
      }

      const createEvent = (e: typeof apiEvents[0], latlng: { lat: number; lng: number }): TournamentEvent => ({
        id: String(e.id),
        name: e.name ?? e.event_type_open_name,
        type: mapEventType(e),
        ageCategory: mapAgeCategory(e),
        grade: mapTournamentGrade(e),
        startDate: e.start_date,
        venue: e.place_name || e.shop_name,
        address: resolveAddress(e),
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
      });

      const addressToEvents = new Map<string, typeof apiEvents>();
      for (const e of apiEvents) {
        const addr = resolveAddress(e);
        if (!addressToEvents.has(addr)) {
          addressToEvents.set(addr, []);
        }
        addressToEvents.get(addr)!.push(e);
      }

      let coords: Record<string, { lat: number; lng: number } | null> = {};

      if (hasCachedAll) {
        coords = await geocodeAddresses(addresses);
        const newEventsList: TournamentEvent[] = [];
        apiEvents.forEach(e => {
          const addr = resolveAddress(e);
          const latlng = coords[addr];
          if (latlng) {
            newEventsList.push(createEvent(e, latlng));
          }
        });
        setEvents(newEventsList);
      } else {
        coords = await geocodeAddresses(
          addresses,
          (done, total) => {
            if (!isCancelled()) setGeocodeProgress({ done, total });
          },
          (address, latlng) => {
            if (isCancelled()) return;

            if (latlng) {
              const eventsForAddr = addressToEvents.get(address) || [];
              const newEvents = eventsForAddr.map(e => createEvent(e, latlng));
              setEvents(prev => {
                const ids = new Set(prev.map(e => e.id));
                const filtered = newEvents.filter(e => !ids.has(e.id));
                return [...prev, ...filtered];
              });
            }
          },
        );
      }

      if (isCancelled()) return;

      const failed: typeof apiEvents = [];
      apiEvents.forEach(e => {
        const addr = resolveAddress(e);
        if (!coords[addr]) {
          failed.push(e);
        }
      });

      console.info(
        `[BBX Map] 取得: ${apiEvents.length} 件 / 表示: ${apiEvents.length - failed.length} 件 / 失敗: ${failed.length} 件`,
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
    } catch (err) {
      if (!isCancelled()) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      }
    } finally {
      if (!isCancelled()) {
        setLoading(false);
        setGeocoding(false);
        setGeocodeProgress(null);
        isFirstLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

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

  const panelEvents = useMemo(() => {
    if (!selectedId) return [];
    const selected = filteredEvents.find(e => e.id === selectedId);
    if (!selected) return [];
    const lat = selected.lat.toFixed(5);
    const lng = selected.lng.toFixed(5);
    return filteredEvents.filter(
      e => e.lat.toFixed(5) === lat && e.lng.toFixed(5) === lng,
    );
  }, [selectedId, filteredEvents]);

  const [flyZoom, setFlyZoom] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelect = useCallback((event: TournamentEvent, zoom = false) => {
    setFlyZoom(zoom);
    setSelectedId(event.id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

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
  const isFirst = isFirstLoad.current;

  return (
    <div className="app">
      <header className="app-header">
        <button
          className={`app-header__menu${sidebarOpen ? ' app-header__menu--active' : ''}`}
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="フィルターを開く"
        >
          <FilterIcon />
        </button>
        <div className="app-header__title">
          <img
            className="app-header__logo"
            src="/favicon.svg"
            alt=""
            aria-hidden="true"
          />
          <span>BBX 大会マップ</span>
        </div>
        <div className="app-header__nav">
          <button
            className={`app-header__menu${menuOpen ? ' app-header__menu--active' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="メニューを開く"
          >
            <MenuIcon />
          </button>
          {menuOpen && createPortal(
            <>
              <div className="app-header__overlay" onClick={() => setMenuOpen(false)} />
              <div className="app-header__popup">
                <a
                  className="app-header__popup-item"
                  href="https://beyblade.takaratomy.co.jp/beyblade-x/event/schedule.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                >
                  公式サイト ↗
                </a>
                <a
                  className="app-header__popup-item"
                  href="https://beymetchannel.github.io/BeyCalendar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                >
                  BEYカレンダー ↗
                </a>
              </div>
            </>,
            document.body,
          )}
        </div>
      </header>

      <a
        className="promo-banner"
        href="https://jp.mercari.com/item/m10908638615"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img className="promo-banner__img" src="/promo-item.png" alt="SP Meter X" />
        <span className="promo-banner__label">PR</span>
        <span className="promo-banner__text">シュートパワーを手軽に計測できる自作デバイスを販売開始！ ↗</span>
      </a>

      {isInitializing && (
        <div className="loading-bar-top">
          <div className="loading-bar-top__content">
            <div className="loading-spinner-small" />
            <span className="loading-bar-top__text">
              {loading
                ? isFirst
                  ? "イベントを一括取得中"
                  : "データを更新中…"
                : geocodeProgress
                  ? isFirst
                    ? `地図情報を読み込み中（初回のみ）: ${geocodeProgress.done} / ${geocodeProgress.total}`
                    : `地図情報を更新中: ${geocodeProgress.done} / ${geocodeProgress.total}`
                  : "地図情報を取得中…"}
            </span>
          </div>
          {geocoding && geocodeProgress && (
            <div className="loading-bar-top__progress">
              <div
                className="loading-bar-top__progress-fill"
                style={{
                  width: `${(geocodeProgress.done / geocodeProgress.total) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="app-body">
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}>
          <FilterBar
            activeAgeCategories={activeAgeCategories}
            onToggleAge={toggleAge}
            activeGrades={activeGrades}
            onToggleGrade={toggleGrade}
            query={query}
            onQueryChange={setQuery}
          />
          <div className="sidebar__count">
            {isInitializing
              ? "読み込み中…"
              : `${filteredEvents.length} 件の大会`}
          </div>
          <EventList
            events={filteredEvents}
            selectedId={selectedId}
            onSelect={(e) => handleSelect(e, true)}
          />
        </aside>

        <main className="map-wrapper">
          <footer className="app-footer">
            <a
              className="app-footer__link"
              href="https://x.com/noritsunetsune"
              target="_blank"
              rel="noopener noreferrer"
            >
              @noritsunetsune
            </a>
            <span className="app-footer__sep">·</span>
            <a
              className="app-footer__link"
              href="https://github.com/noritsune/bbx-tournament-map"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </footer>
          <MapView
            events={filteredEvents}
            selectedId={selectedId}
            onSelect={handleSelect}
            flyZoom={flyZoom}
          />

          {error && !isInitializing && (
            <div className="error-overlay">
              <div className="error-box">
                <p className="error-box__title">データの取得に失敗しました</p>
                <p className="error-box__msg">{error}</p>
                <button
                  className="error-box__retry"
                  onClick={() => window.location.reload()}
                >
                  再試行
                </button>
              </div>
            </div>
          )}
        </main>

        {selectedId && panelEvents.length > 0 && (
          <aside className="detail-panel">
            {panelEvents.length > 1 && (
              <div className="detail-panel__header">
                <div className="detail-panel__meta">
                  <span className="detail-panel__title">
                    {panelEvents.length} 件の大会
                  </span>
                  <span className="detail-panel__venue">
                    {panelEvents[0].prefecture} · {panelEvents[0].venue}
                  </span>
                  <span className="detail-panel__address">
                    {panelEvents[0].address}
                  </span>
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
                  onClick={() => setSelectedId(null)}
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="detail-panel__scroll">
              {panelEvents.map((ev, i) => (
                <div
                  key={ev.id}
                  className={i > 0 ? "detail-panel__divider" : ""}
                >
                  <EventDetail
                    event={ev}
                    onClose={() => setSelectedId(null)}
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
