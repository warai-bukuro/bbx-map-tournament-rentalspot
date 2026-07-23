import type { AgeCategory, TournamentGrade, RentalChain } from '../types';
import { AGE_CATEGORY_LABELS, GRADE_LABELS, GRADE_COLORS, RENTAL_CHAIN_LABELS, RENTAL_CHAIN_COLORS } from '../types';

const ALL_GRADES: TournamentGrade[] = ['G3', 'G2', 'G1', 'S1', 'other'];
const ALL_AGES: AgeCategory[] = ['open', 'regular'];
const ALL_RENTAL_CHAINS: RentalChain[] = ['katsuatsu', 'kidsland-us', 'cote-dazur', 'beyblade-bar-tokyo', 'katori-jinja', 'hotel-monday', 'round1-spoccha'];

interface Props {
  activeAgeCategories: Set<AgeCategory>;
  onToggleAge: (cat: AgeCategory) => void;
  activeGrades: Set<TournamentGrade>;
  onToggleGrade: (grade: TournamentGrade) => void;
  showEvents: boolean;
  onToggleEvents: () => void;
  showRentals: boolean;
  onToggleRentals: () => void;
  activeRentalChains: Set<RentalChain>;
  onToggleRentalChain: (chain: RentalChain) => void;
  query: string;
  onQueryChange: (q: string) => void;
}

export function FilterBar({
  activeAgeCategories,
  onToggleAge,
  activeGrades,
  onToggleGrade,
  showEvents,
  onToggleEvents,
  showRentals,
  onToggleRentals,
  activeRentalChains,
  onToggleRentalChain,
  query,
  onQueryChange,
}: Props) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__search">
        <input
          type="search"
          className="filter-bar__input"
          placeholder="会場名・都道府県・店舗名を検索"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
      </div>

      <div className="filter-section">
        <label className="filter-check filter-section__master">
          <input
            type="checkbox"
            checked={showEvents}
            onChange={onToggleEvents}
          />
          <span>大会を表示</span>
        </label>
      </div>

      {showEvents && <>
        <div className="filter-section">
          <p className="filter-section__label">年齢区分</p>
          <div className="filter-checks">
            {ALL_AGES.map(cat => (
              <label key={cat} className="filter-check">
                <input
                  type="checkbox"
                  checked={activeAgeCategories.has(cat)}
                  onChange={() => onToggleAge(cat)}
                />
                <span>{AGE_CATEGORY_LABELS[cat]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <p className="filter-section__label">大会タイプ</p>
          <div className="filter-checks">
            {ALL_GRADES.map(grade => (
              <label key={grade} className="filter-check">
                <input
                  type="checkbox"
                  checked={activeGrades.has(grade)}
                  onChange={() => onToggleGrade(grade)}
                />
                <span
                  className="filter-check__badge"
                  style={{ background: GRADE_COLORS[grade] }}
                >
                  {GRADE_LABELS[grade]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </>}

      <div className="filter-section">
        <label className="filter-check filter-section__master">
          <input
            type="checkbox"
            checked={showRentals}
            onChange={onToggleRentals}
          />
          <span>貸出店舗を表示</span>
        </label>
      </div>

      {showRentals && (
        <div className="filter-section">
          <p className="filter-section__label">チェーン</p>
          <div className="filter-checks">
            {ALL_RENTAL_CHAINS.map(chain => (
              <label key={chain} className="filter-check">
                <input
                  type="checkbox"
                  checked={activeRentalChains.has(chain)}
                  onChange={() => onToggleRentalChain(chain)}
                />
                <span
                  className="filter-check__badge"
                  style={{ background: RENTAL_CHAIN_COLORS[chain] }}
                >
                  {RENTAL_CHAIN_LABELS[chain]}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
