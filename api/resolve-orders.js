import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pendingOrders } = req.body;
    
    if (!pendingOrders || pendingOrders.length === 0) {
      return res.status(200).json({ resolvedCount: 0, resolutions: [] });
    }

    const resolutions = [];

    // Process each pending order
    for (const order of pendingOrders) {
      const orderDate = new Date(order.orderDate);
      
      // We want to fetch historical prices from the order date until today + 1 day
      // because Yahoo Finance requires a range.
      const period1 = orderDate.toISOString().split('T')[0];
      const today = new Date();
      today.setDate(today.getDate() + 2); // Pad end date
      const period2 = today.toISOString().split('T')[0];

      try {
        const historical = await yahooFinance.historical(order.symbol, {
          period1,
          period2,
          interval: '1d'
        });

        if (historical && historical.length > 0) {
          // Find the first trading day on or after the order date
          // historical data is usually sorted oldest to newest
          const targetDay = historical.find(d => new Date(d.date) >= orderDate);
          
          if (targetDay && targetDay.close) {
            const nav = targetDay.close;
            const units = order.amount / nav;

            resolutions.push({
              orderId: order.id,
              symbol: order.symbol,
              name: order.name,
              type: order.type,
              amount: order.amount,
              settledNav: nav,
              settledUnits: units,
              executionDate: targetDay.date
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch history for ${order.symbol}:`, err);
        // Continue to next order, maybe this one is just missing data temporarily
      }
    }

    return res.status(200).json({ 
      resolvedCount: resolutions.length, 
      resolutions 
    });

  } catch (error) {
    console.error('Resolve Orders Error:', error);
    res.status(500).json({ error: 'Failed to resolve orders' });
  }
}
