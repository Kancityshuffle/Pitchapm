# Convince a PM

MVP web app that helps you craft a short, compelling argument for a feature request.

## Run locally

1) Install dependencies:

```bash
npm install
```

2) Add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env` and set `OPENAI_API_KEY`.

3) Start the API server:

```bash
npm run dev:server
```

4) In another terminal, start the frontend:

```bash
npm run dev
```

Open http://localhost:5173
