const OpenAI = require('openai');

const SYSTEM_PROMPT = `Você é um especialista em orações e novenas católicas brasileiras.
Sua tarefa é fornecer o texto completo e detalhado de novenas.
Sempre responda APENAS com JSON válido, sem markdown, sem texto extra antes ou depois.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome da novena é obrigatório' });

  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'Chave de API não configurada no servidor' });

  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const userPrompt = `Forneça o texto completo da novena: "${nome}".

Retorne SOMENTE este JSON (sem markdown, sem explicação fora do JSON):
{
  "nome": "Nome completo da novena",
  "descricao": "Descrição em 1-2 frases sobre esta novena",
  "santo": "Nome do santo ou Nossa Senhora (ou null)",
  "intencao_sugerida": "Para que intenções esta novena é tipicamente rezada",
  "dias": [
    {
      "dia": 1,
      "titulo": "1º Dia - [tema do dia]",
      "oracao_abertura": "Invocação ou oração inicial do dia (2-4 linhas)",
      "meditacao": "Reflexão ou meditação do dia (3-6 linhas sobre virtude ou passagem relacionada)",
      "oracao_principal": "Oração principal completa do dia (6-12 linhas, texto devocional)",
      "peticao": "Petição específica do dia (2-4 linhas)",
      "oracao_final": "Encerramento com Pai Nosso, Ave Maria ou Gloria ao Pai indicados"
    }
  ]
}

REGRAS:
- O array "dias" deve ter EXATAMENTE 9 elementos
- Cada campo deve ter conteúdo real e devocional, não placeholders
- Use português brasileiro, linguagem devocional e respeitosa
- Se não conhecer a novena específica, crie uma baseada na tradição católica para esse santo/intenção`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content;
    let novenaDados;

    try {
      novenaDados = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) novenaDados = JSON.parse(match[0]);
    }

    if (!novenaDados || !Array.isArray(novenaDados.dias) || novenaDados.dias.length === 0) {
      return res.status(500).json({ error: 'Não foi possível gerar o texto da novena. Tente novamente.' });
    }

    while (novenaDados.dias.length < 9) {
      const ultimo = { ...novenaDados.dias[novenaDados.dias.length - 1] };
      ultimo.dia = novenaDados.dias.length + 1;
      ultimo.titulo = `${novenaDados.dias.length + 1}º Dia`;
      novenaDados.dias.push(ultimo);
    }
    novenaDados.dias = novenaDados.dias.slice(0, 9);

    res.json(novenaDados);
  } catch (err) {
    console.error('Erro Groq:', err.message);
    res.status(500).json({ error: 'Erro ao gerar novena. Tente novamente.' });
  }
};
