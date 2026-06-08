import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, transactions } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable. Please add it to Vercel.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Minimize data to avoid hitting token limits and speed up response
    const miniTxs = (transactions || []).map(t => `${t.date.split('T')[0]} | ${t.type} | ${t.category} | ${t.amount} | ${t.title || t.notes || ''}`).join('\n');
    
    const systemPrompt = `You are an expert, highly intelligent Personal Finance AI Assistant embedded inside a sleek finance app. 
Your job is to analyze the user's financial data and answer their questions in a friendly, concise, and accurate manner.
If they misspell words, figure out what they mean.

USER'S DATA:
Transactions (Date | Type | Category | Amount | Notes):
${miniTxs}

RULES:
1. Be extremely concise. Keep answers to 1-3 short sentences.
2. Format numbers nicely with ₹ (Indian Rupees).
3. If the user asks something completely unrelated to finance, politely decline and steer them back to their data.
4. Use markdown for bolding important numbers or categories.
5. If there is no data matching their request, tell them nicely.`;

    let result;
    try {
      result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\nUSER QUESTION: ' + query }] }
        ]
      });
    } catch (modelError) {
      // If the latest flash model throws a 404 or unsupported error, fallback to the older proven gemini-pro
      console.warn("Primary model failed, falling back to gemini-pro", modelError);
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
      result = await fallbackModel.generateContent({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\nUSER QUESTION: ' + query }] }
        ]
      });
    }

    const responseText = result.response.text();

    return res.status(200).json({ reply: responseText });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with AI', details: error.message });
  }
}
