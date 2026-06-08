import React from 'react';

/**
 * CashFlowWaterfall: Visualizes how Income is split into Needs, Wants, and Savings.
 */
export default function CashFlowWaterfall({ 
  income = 0, 
  needs = 0, 
  wants = 0 
}) {
  const savings = Math.max(0, income - needs - wants);
  
  // Percentages relative to income (if income is 0, use total expenses + savings for scale)
  const total = income > 0 ? income : (needs + wants + savings || 1);
  
  const pNeeds = (needs / total) * 100;
  const pWants = (wants / total) * 100;
  const pSavings = (savings / total) * 100;

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex justify-between items-end mb-2">
        <span className="headline">Cash Flow</span>
        <span className="caption t-tertiary">Income vs Distribution</span>
      </div>

      {/* Top Bar: Total Income */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-sm fw-bold">
          <span style={{ color: 'var(--c-green)' }}>Income</span>
          <span>₹{income.toLocaleString()}</span>
        </div>
        <div 
          style={{
            width: '100%',
            height: '14px',
            background: 'var(--c-green)',
            borderRadius: '7px',
            boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.3), 0 0 10px rgba(40,205,65,0.3)'
          }}
        />
      </div>

      {/* Bottom Stack: Needs + Wants + Savings */}
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex justify-between text-sm fw-bold">
          <span className="t-primary">Distribution</span>
          <span className="t-tertiary">
            {(income > 0) ? '100%' : '—'}
          </span>
        </div>
        
        {/* The Stacked Bar */}
        <div 
          className="flex overflow-hidden"
          style={{
            width: '100%',
            height: '14px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: '7px',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)'
          }}
        >
          <div 
            title={`Needs: ₹${needs}`}
            style={{
              width: `${pNeeds}%`,
              background: 'var(--c-cyan)',
              borderRight: pNeeds > 0 ? '1px solid rgba(0,0,0,0.3)' : 'none',
              transition: 'width 1s ease',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)'
            }}
          />
          <div 
            title={`Wants: ₹${wants}`}
            style={{
              width: `${pWants}%`,
              background: 'var(--c-pink)',
              borderRight: pWants > 0 ? '1px solid rgba(0,0,0,0.3)' : 'none',
              transition: 'width 1s ease',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)'
            }}
          />
          <div 
            title={`Savings/Surplus: ₹${savings}`}
            style={{
              width: `${pSavings}%`,
              background: 'var(--c-indigo-lt)',
              transition: 'width 1s ease',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)'
            }}
          />
        </div>
        
        {/* Legend */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1 caption">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-cyan)' }} />
            <span>Needs ({Math.round(pNeeds)}%)</span>
          </div>
          <div className="flex items-center gap-1 caption">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-pink)' }} />
            <span>Wants ({Math.round(pWants)}%)</span>
          </div>
          <div className="flex items-center gap-1 caption">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-indigo-lt)' }} />
            <span>Savings ({Math.round(pSavings)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
