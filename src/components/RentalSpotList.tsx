import type { RentalSpot } from '../types';
import { RENTAL_CHAIN_LABELS, RENTAL_CHAIN_COLORS } from '../types';

interface Props {
  spots: RentalSpot[];
  selectedId: string | null;
  onSelect: (spot: RentalSpot) => void;
}

export function RentalSpotList({ spots, selectedId, onSelect }: Props) {
  if (spots.length === 0) {
    return (
      <div className="event-list__empty">
        <p>該当する貸出店舗が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="event-list">
      {spots.map(spot => (
        <RentalSpotCard
          key={spot.id}
          spot={spot}
          selected={spot.id === selectedId}
          onClick={() => onSelect(spot)}
        />
      ))}
    </div>
  );
}

function RentalSpotCard({ spot, selected, onClick }: { spot: RentalSpot; selected: boolean; onClick: () => void }) {
  const chainLabel = RENTAL_CHAIN_LABELS[spot.chain] ?? spot.chain;
  const chainColor = RENTAL_CHAIN_COLORS[spot.chain] ?? '#78909c';

  return (
    <button
      className={`event-card rental-card${selected ? ' event-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="event-card__header">
        <span
          className="event-card__badge rental-card__badge"
          style={{ background: chainColor }}
        >
          {chainLabel}
        </span>
        <span className="event-card__pref">{spot.prefecture}</span>
      </div>
      <p className="event-card__name">{spot.name}</p>
      <p className="event-card__venue">{spot.address}</p>
      {spot.phone && (
        <p className="event-card__phone">📞 {spot.phone}</p>
      )}
    </button>
  );
}