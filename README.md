# MO — Tibetan Dice Divination | TCCT

A web-based Mo divination oracle based on the system of Jamgon Mipham Rinpoche. Two dice are cast to produce one of 36 syllable combinations from the Manjushri mantra (AH RA PA TSA NA DHI), with AI-powered personalized interpretations.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import in Vercel (vercel.com → New Project → select this repo)
3. Add environment variable: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Deploy

## Local development

```bash
npm install
npm run dev
```

For the AI interpretation to work locally, create `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Part of the Tibetan Crypto Calendar (TCCT) project
