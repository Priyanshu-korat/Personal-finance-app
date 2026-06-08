import React, { useMemo, useState } from 'react';

/**
 * SpendingBarcode: An audio-equalizer style visualization of daily spend.
 * Height = Amount spent. Opacity/Glow = Number of transactions.
 * Hovering snaps a liquid glass tooltip to the bar.
 */
export default function SpendingBarcode({ transactions = [], currentMonth, currentYear }) {
  const [hoverDay, setHoverDay] = useState(null);

  const { maxSpend, days } = useMemo(() => {
    const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Initialize day map
    const dayMap = Array.from({ length: numDays }, (_, i) => ({
      day: i + 1,
      total: 0,
      count: 0,
      items: []
    }));
    
    // Aggregate data
    transactions.forEach(tx => {
      if (tx.type === 'Expense') {
        const d = new Date(tx.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate() - 1;
          const amount = parseFloat(tx.amount) || 0;
          dayMap[day].total += amount;
          dayMap[day].count += 1;
          dayMap[day].items.push({ 
            title: tx.title || tx.category, 
            amount: amount 
          });
        }
      }
    });

    const max = Math.max(...dayMap.map(d => d.total), 1);
    const maxCount = Math.max(...dayMap.map(d => d.count), 1);

    return { 
      maxSpend: max, 
      days: dayMap.map(d => ({
        ...d,
        heightPct: (d.total / max) * 100,
        density: d.count / maxCount
      }))
    };
  }, [transactions, currentMonth, currentYear]);

  // Height of the chart container
  const H = 100;

  return (
    <div className="w-full relative flex flex-col gap-2">
      <div className="flex justify-between items-end mb-2">
        <span className="headline">Spending Barcode</span>
        <span className="caption t-tertiary">Volume & Frequency</span>
      </div>

      <div 
        className="flex items-end justify-between relative w-full"
        style={{ height: H, paddingBottom: 2, borderBottom: '1px solid var(--lg-border)' }}
        onMouseLeave={() => setHoverDay(null)}
      >
        {days.map((d) => {
          const isHovered = hoverDay === d.day;
          // Calculate visual properties
          const h = Math.max(d.heightPct, 4); // min height of 4% for zero days to show a tiny notch
          
          // Color based on density (more txns = brighter cyan/indigo)
          let bg = 'rgba(255,255,255,0.05)';
          let shadow = 'none';
          
          if (d.total > 0) {
            bg = d.density > 0.6 ? 'var(--c-cyan)' : 'var(--c-indigo-lt)';
            shadow = isHovered 
              ? `0 0 12px ${bg}, 0 0 24px ${bg}`
              : `0 0 ${d.density * 10}px ${bg}`;
          }

          return (
            <div 
              key={d.day}
              className="lg-interactive"
              onMouseEnter={() => setHoverDay(d.day)}
              style={{
                width: 'calc(100% / 31 - 2px)', // fluid width
                height: `${h}%`,
                background: isHovered ? 'var(--c-gold)' : bg,
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: isHovered ? '0 0 16px var(--c-gold)' : shadow,
                cursor: 'crosshair',
                opacity: (hoverDay !== null && !isHovered) ? 0.3 : 1
              }}
            />
          );
        })}

        {/* Floating Tooltip */}
        {hoverDay !== null && (
          <div 
            className="absolute lg lg-r-xl lg-p-md anim-fade-in"
            style={{
              bottom: '100%',
              left: `clamp(10px, ${(hoverDay / days.length) * 100}%, calc(100% - 160px))`,
              transform: 'translateX(-50%)',
              marginBottom: 12,
              width: 180,
              zIndex: 10,
              pointerEvents: 'none',
              background: 'rgba(20,20,20,0.65)',
              backdropFilter: 'blur(30px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="flex justify-between items-center mb-2 border-b pb-1" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <span className="caption fw-bold">Day {hoverDay}</span>
              <span className="caption t-gold fw-bold">₹{days[hoverDay - 1].total.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1 max-h-32 overflow-hidden">
              {days[hoverDay - 1].items.length > 0 ? (
                days[hoverDay - 1].items.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="t-tertiary truncate" style={{ maxWidth: '60%' }}>{item.title}</span>
                    <span>₹{item.amount}</span>
                  </div>
                ))
              ) : (
                <span className="text-xs t-tertiary italic">No spending</span>
              )}
              {days[hoverDay - 1].items.length > 4 && (
                <span className="text-xs t-tertiary italic">+ {days[hoverDay - 1].items.length - 4} more</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between caption t-tertiary" style={{ fontSize: 10 }}>
        <span>1st</span>
        <span>15th</span>
        <span>31st</span>
      </div>
    </div>
  );
}
