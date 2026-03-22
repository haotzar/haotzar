import meilisearchEngine from './meilisearchEngine';
import { getSetting } from './settingsManager';

const DEFAULT_MODEL = 'gemini-1.5-flash';

const buildContextsFromResults = (results, topK) => {
  const contexts = [];

  for (const result of results || []) {
    const file = result?.file;
    const fileName = file?.name || file?.id || '';

    for (const ctx of (result?.contexts || [])) {
      contexts.push({
        fileId: file?.id,
        fileName,
        filePath: file?.path,
        pageNum: ctx.pageNum,
        score: ctx.score,
        text: ctx.text || ctx.context || ctx.highlighted || ctx.content || '',
      });

      if (contexts.length >= topK) return contexts;
    }

    if (contexts.length >= topK) return contexts;
  }

  return contexts;
};

const buildPrompt = (question, contexts) => {
  const sourcesText = contexts
    .map((c, i) => {
      const location = c.pageNum ? `עמוד ${c.pageNum}` : '';
      const header = `[${i + 1}] ${c.fileName}${location ? ` (${location})` : ''}`;
      return `${header}\n${c.text}`;
    })
    .join('\n\n');

  return [
    'ענה על השאלה לפי המקורות בלבד.',
    'אם אין מספיק מידע במקורות כדי לענות, אמור שאין מספיק מידע.',
    'החזר בסוף רשימת מקורות בפורמט: [מספר] שם קובץ (עמוד אם קיים).',
    '',
    `שאלה: ${question}`,
    '',
    'מקורות:',
    sourcesText || '(אין מקורות)',
  ].join('\n');
};

const callGeminiGenerateContent = async ({ apiKey, model, prompt }) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const msg = data?.error?.message || `Gemini API error (${resp.status})`;
    throw new Error(msg);
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join('') || '';

  return text;
};

export const askWithMcpGeminiMeili = async (
  question,
  {
    apiKey = null,
    model = DEFAULT_MODEL,
    topK = 8,
    searchOptions = {},
  } = {}
) => {
  const resolvedApiKey = (apiKey ?? getSetting('geminiApiKey', '')).trim();

  if (!resolvedApiKey) {
    throw new Error('Missing Gemini API key');
  }

  const meiliResults = await meilisearchEngine.search(question, searchOptions);
  const contexts = buildContextsFromResults(meiliResults, topK);
  const prompt = buildPrompt(question, contexts);

  const answer = await callGeminiGenerateContent({ apiKey: resolvedApiKey, model, prompt });

  return {
    answer,
    contexts,
  };
};
