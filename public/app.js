const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const VITE_OPENROUTER_API_KEY = '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';

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

    console.log('Body enviado para API OpenRouter:', JSON.stringify({
      model: 'google/gemma-3n-e4b-it:free',
      messages: fullMessages
    }, null, 2));

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

      const req = https.request(options, (res) => {
        let chunks = [];
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            console.error('Erro da API OpenRouter:', res.statusCode, body);
            reject(new Error(`API error: ${res.statusCode} - ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('Erro:', err);
    if (err.response) {
      console.error('Resposta da API:', err.response.data);
    }
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
