import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, transactions, investments } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable. Please add it to Vercel.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Minimize data to avoid hitting token limits and speed up response
    const miniTxs = (transactions || []).map(t => `${t.date.split('T')[0]} | ${t.type} | ${t.category} | ${t.amount} | ${t.title || t.notes || ''}`).join('\n');
    const miniInvs = (investments || []).map(i => `${i.type} | ${i.name} (${i.symbol}) | Qty: ${i.quantity} | AvgBuy: ${i.averageBuyPrice} | Current: ${i.currentPrice}`).join('\n');
    
    const systemPrompt = `You are an expert, highly intelligent Personal Finance and Wealth Management AI Assistant embedded inside a sleek finance app. 
Your job is to analyze the user's financial data and answer their questions in a friendly, concise, and accurate manner.
If they misspell words, figure out what they mean.

USER'S DATA:
--- TRANSACTIONS ---
(Date | Type | Category | Amount | Notes):
${miniTxs}

--- INVESTMENTS (Stocks & SIPs) ---
(Type | Name | Qty | AvgBuy | Current Price):
${miniInvs}

RULES:
1. Be extremely concise. Keep answers to 1-3 short sentences.
2. Format numbers nicely with ₹ (Indian Rupees).
3. If they ask about their investments, calculate their profit/loss and suggest which are performing best/worst.
4. Use markdown for bolding important numbers or categories.
5. If there is no data matching their request, tell them nicely.`;

    // The API key is valid but older models like 1.5 were deprecated. 
    // We use the universally available alias: gemini-flash-latest
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\nUSER QUESTION: ' + query }] }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API Error:", errText);
      throw new Error(`API Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

    return res.status(200).json({ reply: responseText });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with AI', details: String(error) });
  }
}
