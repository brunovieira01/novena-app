const OpenAI = require('openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'API key não configurada' });

  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const prompt = `Pesquise as versões e variações da novena: "${nome}".

Retorne SOMENTE este JSON:
{
  "opcoes": [
    {
      "nome": "Nome completo e específico desta versão",
      "descricao": "O que é esta versão e para que serve (1-2 frases)",
      "dias": 9,
      "observacao": "Origem, tradição ou particularidade desta versão (pode ser null)"
    }
  ]
}

REGRAS IMPORTANTES:
- Liste de 2 a 4 opções REAIS e distintas
- Se a novena tem versão de 9 dias E de 27 dias, liste AMBAS com os dias corretos
- Se existem variantes (tradicional, especial, para alguma graça específica), liste-as separadamente
- O campo "dias" deve ser o número REAL de dias dessa versão específica (pode ser 9, 13, 27, 33, etc.)
- Se não houver variações conhecidas, liste ao menos 1 opção correta
- Retorne SOMENTE o JSON, sem markdown`;

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: 'Você é especialista em novenas e orações católicas brasileiras. Responda sempre com JSON válido.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content;
    let data;
    try { data = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); if (m) data = JSON.parse(m[0]); }

    if (!data || !Array.isArray(data.opcoes) || data.opcoes.length === 0) {
      return res.status(404).json({ error: 'Não foi possível encontrar opções para esta novena.' });
    }

    // Garante que dias é número válido em cada opção
    data.opcoes = data.opcoes.map(o => ({ ...o, dias: Math.max(1, parseInt(o.dias) || 9) }));

    res.json(data);
  } catch (err) {
    console.error('Erro pesquisar-novena:', err.message);
    res.status(500).json({ error: 'Erro ao pesquisar novena. Tente novamente.' });
  }
};
