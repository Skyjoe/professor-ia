const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// 🔒 Usa variável de ambiente (definida na Vercel ou no .env local)
const VITE_OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY;

app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!VITE_OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Chave VITE_OPENROUTER_API_KEY não encontrada nas variáveis de ambiente' });
  }

  console.log('Messages recebidos:', messages);

  try {
    // Instruções do sistema
    const systemContent = 'Você é um professor Socratic estritamente guiado em matemática, física e química. SUA ÚNICA TAREFA é fazer perguntas para ajudar o aluno a pensar e resolver sozinho. NÃO RESOLVA A QUESTÃO. NÃO CALCULE. NÃO REVELE RESPOSTAS OU NÚMEROS. Quando uma questão é apresentada, responda APENAS com 1 ou 2 perguntas abertas. Parabenize e elogie o aluno quando ele acertar as respostas às suas perguntas ou alcançar o resultado correto, dizendo coisas como "Excelente!" ou "Muito bem, continue assim!". PARE de fazer perguntas quando o aluno chega à resposta final. Aguarde a resposta do aluno para continuar. Se o aluno pedir ajuda em conceitos básicos, explique brevemente sem resolver.';

    // Prepend system content to the first user message
    const fullMessages = messages.map((msg, index) => {
      if (index === 0 && msg.role === 'user') {
        return { ...msg, content: systemContent + '\n\n' + msg.content };
      }
      return msg;
    });

    const postData = JSON.stringify({
      model: 'google/gemma-3n-e4b-it:free',
      messages: fullMessages
    });

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VITE_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const reqApi = https.request(options, (resApi) => {
        let chunks = [];
        resApi.on('data', (chunk) => chunks.push(chunk));
        resApi.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          if (resApi.statusCode >= 200 && resApi.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.error('Erro da API OpenRouter:', resApi.statusCode, body);
            reject(new Error(`API error: ${resApi.statusCode} - ${body}`));
          }
        });
      });

      reqApi.on('error', reject);
      reqApi.write(postData);
      reqApi.end();
    });

    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
