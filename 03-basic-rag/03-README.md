# 03 - Basic RAG

## Requirements

- Node.js 18+
- Ollama installed and running (https://ollama.com/)
- Ollama models:
  - `qwen2.5:3b`
  - `all-minilm:l6-v2`

To get the models, run:

```bash
ollama pull qwen2.5:3b
ollama pull all-minilm:l6-v2
```

## Configuration

If you want to use an alternative model, copy `.env.example` to `.env` and change the model name in the `.env` file.


## Quickstart

```bash
npm install
npm start
```

Open the browser and navigate to `http://localhost:3000` to see the app in action.

Try asking: "What happened on April 15th on Elara-7?"
