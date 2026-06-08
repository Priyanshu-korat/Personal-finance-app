import React, { useMemo } from 'react';

/**
 * SpendingHeatmap: A 31-day visual grid showing daily spend intensity.
 * Empty days are glass outlines; spend days glow from yellow to red based on intensity.
 */
export default function SpendingHeatmap({ transactions = [], currentMonth, currentYear }) {
  
  const { maxSpend, days } = useMemo(() => {
    // Get number of days in the month
    const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Initialize day map
    const dayTotals = Array(numDays).fill(0);
    
    // Sum expenses per day
    transactions.forEach(tx => {
      if (tx.type === 'Expense') {
        const d = new Date(tx.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          dayTotals[day - 1] += parseFloat(tx.amount) || 0;
        }
      }
    });

    const max = Math.max(...dayTotals, 1); // Avoid div by 0

    const daysData = dayTotals.map((total, index) => {
      const intensity = total / max;
      return {
        day: index + 1,
        total,
        intensity
      };
    });

    return { maxSpend: max, days: daysData };
  }, [transactions, currentMonth, currentYear]);

  // Color gradient based on intensity (0.0 to 1.0)
  // Low: Yellow/Gold, Med: Orange, High: Red
  const getColor = (intensity) => {
    if (intensity === 0) return 'rgba(255, 255, 255, 0.05)'; // Empty glass
    if (intensity < 0.33) return 'rgba(255, 214, 10, 0.8)'; // Gold
    if (intensity < 0.66) return 'rgba(255, 159, 10, 0.9)'; // Orange
    return 'rgba(255, 69, 58, 1.0)'; // Red
  };

  const getGlow = (intensity) => {
    if (intensity === 0) return 'none';
    if (intensity < 0.33) return '0 0 8px rgba(255, 214, 10, 0.4)';
    if (intensity < 0.66) return '0 0 12px rgba(255, 159, 10, 0.5)';
    return '0 0 16px rgba(255, 69, 58, 0.6)';
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between items-end mb-4">
        <span className="headline">The Burn Rate</span>
        <span className="caption t-tertiary">Daily Heatmap</span>
      </div>

      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '6px',
        }}
      >
        {days.map(({ day, total, intensity }) => (
          <div 
            key={day}
            title={`Day ${day}: ₹${total}`}
            className="lg-interactive" // hover states
            style={{
              aspectRatio: '1/1',
              borderRadius: '6px',
              background: getColor(intensity),
              border: intensity === 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.2)',
              boxShadow: getGlow(intensity),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}
          >
            {/* Optional: subtle text for day number if there is no spend to keep it clean */}
            {intensity === 0 && (
              <span className="caption" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                {day}
              </span>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between mt-4 caption t-tertiary" style={{ fontSize: '11px' }}>
        <span>Day 1</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255, 214, 10, 0.8)' }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255, 159, 10, 0.9)' }} />
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255, 69, 58, 1.0)' }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
