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

    const systemPrompt = `You are an elite, highly intelligent financial advisor AI.
Your user's name is ${profile?.name || 'User'}.

The user's transaction history is provided below. Analyze it mathematically when asked.
${JSON.stringify(transactions || [])}

The user's live investment portfolio is provided below:
${JSON.stringify(investments || [])}

CRITICAL: If the user says something like "I bought coffee for 150" or "Got my salary of 50000", they are asking you to LOG A TRANSACTION.
When logging a transaction, you MUST respond in this exact JSON format:
\`\`\`json
{
  "text": "Got it! I've logged your coffee expense.",
  "transaction": {
    "type": "Expense", // or "Income"
    "amount": 150,
    "category": "Food & Dining",
    "title": "Coffee"
  }
}
\`\`\`
If it is just a normal question, respond with:
\`\`\`json
{
  "text": "Your normal markdown response here."
}
\`\`\`
You MUST ALWAYS return valid JSON. Do not return plain text.`;

    const result = await model.generateContent(systemPrompt + '\n\nUSER QUESTION: ' + query);
    const response = await result.response;
    let text = response.text();
    
    // Clean up markdown block if present
    text = text.replace(/^\`\`\`json/m, '').replace(/\`\`\`$/m, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Fallback if AI didn't return JSON
      parsed = { text };
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error('AI Chat Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with AI', details: String(error) });
  }
}
