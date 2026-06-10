const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/buscar-novena', async (req, res) => {
  const { nome } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome da novena é obrigatório' });

  try {
    const messages = [
      {
        role: 'user',
        content: `Busque na internet o texto completo da novena: "${nome}".

Após encontrar o texto completo, retorne APENAS um JSON válido com esta estrutura exata (sem markdown, sem texto extra):
{
  "nome": "Nome completo da novena",
  "descricao": "Breve descrição (1-2 frases) sobre esta novena",
  "santo": "Nome do santo ou Nossa Senhora (ou null)",
  "intencao_sugerida": "Para que intenções esta novena é tipicamente rezada",
  "dias": [
    {
      "dia": 1,
      "titulo": "Primeiro Dia - Tema do dia",
      "oracao_abertura": "Oração inicial ou invocação do dia",
      "meditacao": "Texto de meditação ou reflexão do dia",
      "oracao_principal": "Oração principal completa do dia",
      "peticao": "Petição ou súplica específica do dia",
      "oracao_final": "Oração final ou Pai Nosso / Ave Maria indicados"
    }
  ]
}

IMPORTANTE: O array "dias" deve ter exatamente 9 elementos (9 dias). Retorne SOMENTE o JSON.`
      }
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5
        }
      ],
      messages
    });

    let novenaDados = null;

    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        try {
          const jsonMatch = block.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            novenaDados = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          // tenta o texto inteiro
          try {
            novenaDados = JSON.parse(block.text.trim());
          } catch (e2) {
            // continua tentando
          }
        }
        if (novenaDados && novenaDados.dias && novenaDados.dias.length > 0) break;
      }
    }

    if (!novenaDados || !novenaDados.dias || novenaDados.dias.length === 0) {
      return res.status(404).json({ error: 'Não foi possível encontrar o texto completo desta novena.' });
    }

    // Garante que tem 9 dias
    while (novenaDados.dias.length < 9) {
      const ultimo = novenaDados.dias[novenaDados.dias.length - 1];
      novenaDados.dias.push({ ...ultimo, dia: novenaDados.dias.length + 1, titulo: `${novenaDados.dias.length + 1}º Dia` });
    }
    novenaDados.dias = novenaDados.dias.slice(0, 9);

    res.json(novenaDados);
  } catch (error) {
    console.error('Erro ao buscar novena:', error.message);
    res.status(500).json({ error: 'Erro interno ao buscar a novena. Tente novamente.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
