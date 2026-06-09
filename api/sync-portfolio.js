import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symbols } = req.body; // Array of strings like ['RELIANCE.NS', '0P00005WLZ.BO']
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: 'Missing or empty symbols array' });
    }

    // Deduplicate symbols
    const uniqueSymbols = [...new Set(symbols)];

    const mfSymbols = uniqueSymbols.filter(sym => /^\d+$/.test(sym));
    const stockSymbols = uniqueSymbols.filter(sym => !/^\d+$/.test(sym));

    const priceMap = {};

    // Fetch Mutual Funds from MFAPI
    if (mfSymbols.length > 0) {
      await Promise.allSettled(
        mfSymbols.map(async (sym) => {
          try {
            const res = await fetch(`https://api.mfapi.in/mf/${sym}`);
            const data = await res.json();
            if (data && data.data && data.data.length > 0) {
              priceMap[sym] = parseFloat(data.data[0].nav);
            }
          } catch (e) {
            console.error(`MFAPI failed for ${sym}`, e);
          }
        })
      );
    }

    // Fetch Stocks from Yahoo Finance
    if (stockSymbols.length > 0) {
      // Automatically append .NS for Indian stocks if no suffix exists
      const formattedSymbols = stockSymbols.map(sym => {
        if (!sym.includes('.')) return `${sym}.NS`;
        return sym;
      });

      const results = await Promise.allSettled(
        formattedSymbols.map(sym => yahooFinance.quote(sym))
      );

      results.forEach(res => {
        if (res.status === 'fulfilled' && res.value) {
          const q = res.value;
          const baseSymbol = q.symbol.split('.')[0];
          const price = q.regularMarketPrice || q.navPrice || 0;
          priceMap[baseSymbol] = price;
          priceMap[q.symbol] = price;
        }
      });
    }

    return res.status(200).json({ prices: priceMap });
  } catch (error) {
    console.error('Portfolio Sync Error:', error);
    return res.status(500).json({ error: 'Failed to sync portfolio', details: error.message });
  }
}
