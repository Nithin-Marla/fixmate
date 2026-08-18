import React from 'react'

export function SkeletonLine({ width = '100%', height = '0.8rem', style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonCircle({ size = 44 }) {
  return <div className="skeleton skeleton-circle" style={{ width: size, height: size }} />;
}

export function SkeletonCard({ lines = 2 }) {
  return (
    <div className="skeleton-card">
      <SkeletonCircle />
      <div style={{ flex: 1 }}>
        <SkeletonLine width="45%" height="0.9rem" />
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} width={`${70 - i * 15}%`} style={{ marginTop: '0.4rem' }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, lines = 2 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </>
  );
}
