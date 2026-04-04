import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.CANNES_CONFIG = {
    infuraKey: ${JSON.stringify(process.env.CHAINLINK_INFURA_KEY || '')},
    portfolioApiKeyRequired: ${Boolean(process.env.PORTFOLIO_API_KEY)}
  };`);
});

const portfolioStore = {};

app.post('/api/portfolio', async (req, res) => {
  const key = req.headers['x-api-key'];
  if (!process.env.PORTFOLIO_API_KEY || key !== process.env.PORTFOLIO_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized, set PORTFOLIO_API_KEY' });
  }

  const { address, balance, updatedAt } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Missing address' });
  }

  portfolioStore[address] = { balance, updatedAt };
  return res.status(200).json({ message: 'Saved', saved: portfolioStore[address] });
});

app.get('/api/portfolio/:address', async (req, res) => {
  const key = req.headers['x-api-key'];
  if (!process.env.PORTFOLIO_API_KEY || key !== process.env.PORTFOLIO_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const address = req.params.address;
  return res.status(200).json({ data: portfolioStore[address] || null });
});

app.post('/api/claude', async (req, res) => {
  const { prompt, data } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      model: 'local-stub',
      response: 'Claude API key is not configured. Please set CLAUDE_API_KEY in environment and restart.',
      prompt,
      data
    });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'claude-2.1',
        prompt: `Analyze this suggested portfolio data in JSON and provide concise risk/reward suggestions:\n${JSON.stringify({ prompt, data }, null, 2)}`,
        max_tokens_to_sample: 350,
        temperature: 0.3
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'Claude API error', details: err });
    }

    const result = await r.json();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Claude proxy failed', message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Cannes wallet server running at http://localhost:${port}`);
});
