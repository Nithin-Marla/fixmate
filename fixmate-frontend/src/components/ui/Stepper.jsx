import React from 'react'

/**
 * Horizontal step indicator for the booking journey.
 * steps: [{ label }], current: 0-based index.
 */
export default function Stepper({ steps = [], current = 0 }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className={`step-connector ${i <= current ? 'done' : ''}`} />}
          <div className={`step ${i === current ? 'step-active' : ''} ${i < current ? 'step-done' : ''}`}>
            <div className="step-indicator">{i < current ? '✓' : i + 1}</div>
            <span className="step-label">{s.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
