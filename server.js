const express = require('express');
const OpenAI = require('openai');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

if (!process.env.GROQ_API_KEY) {
  console.error('ERRO: defina a variável de ambiente GROQ_API_KEY');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const SYSTEM_PROMPT = `Você é um especialista em orações e novenas católicas brasileiras.
Sua tarefa é fornecer o texto completo e detalhado de novenas.
Sempre responda APENAS com JSON válido, sem markdown, sem texto extra antes ou depois.
O JSON deve seguir exatamente o schema solicitado pelo usuário.`;

app.post('/api/buscar-novena', async (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome da novena é obrigatório' });

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
- Cada campo de texto deve ter conteúdo real e devocional, não placeholders
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

    // Garante exatamente 9 dias
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
    res.status(500).json({ error: 'Erro ao gerar novena. Verifique a conexão e tente novamente.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
