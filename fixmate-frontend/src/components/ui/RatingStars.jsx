import React, { useState } from 'react'

/** Read-only star row: <RatingStars value={4.5} size={16} /> */
export function RatingStars({ value = 0, size = 15 }) {
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    const filled = value >= i - 0.25;
    const half = !filled && value >= i - 0.75;
    stars.push(
      <span key={i} style={{ fontSize: size, lineHeight: 1 }}>
        {filled ? '★' : half ? '⯨' : '☆'}
      </span>
    );
  }
  return <span className="stars" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>{stars}</span>;
}

/** Interactive star selector for submitting a review. */
export function StarSelector({ value = 5, onChange }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="stars stars-interactive">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= active ? 'filled' : ''}`}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** Rating distribution bars, e.g. [{stars:5, count:10, total:16}, ...] */
export function RatingDistribution({ counts = [], total = 0 }) {
  return (
    <div>
      {[5, 4, 3, 2, 1].map((stars) => {
        const c = counts.find((x) => x.stars === stars)?.count || 0;
        const pct = total > 0 ? (c / total) * 100 : 0;
        return (
          <div className="rating-dist" key={stars}>
            <span style={{ minWidth: '2.2rem' }}>{stars} ★</span>
            <div className="rating-dist-bar">
              <div className="rating-dist-fill" style={{ width: `${pct}%` }} />
            </div>
            <span style={{ minWidth: '2rem', textAlign: 'right' }}>{c}</span>
          </div>
        );
      })}
    </div>
  );
}
