import yahooFinance from 'yahoo-finance2';

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

    // Fetch quotes
    // yahooFinance.quote takes an array or single symbol
    const results = await yahooFinance.quote(uniqueSymbols);
    
    // results could be an array or a single object depending on input length
    const quotes = Array.isArray(results) ? results : [results];

    const priceMap = {};
    quotes.forEach(q => {
      // For mutual funds, regularMarketPrice is often used, sometimes navPrice
      priceMap[q.symbol] = q.regularMarketPrice || q.navPrice || 0;
    });

    return res.status(200).json({ prices: priceMap });
  } catch (error) {
    console.error('Portfolio Sync Error:', error);
    return res.status(500).json({ error: 'Failed to sync portfolio', details: error.message });
  }
}
