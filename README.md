# RAG Tutorial Workshop

A step-by-step tutorial for building and understanding Retrieval-Augmented Generation (RAG) systems using Node.js.

**[日本語版はこちらをご覧ください](README_ja.md)** | **[View in Japanese](README_ja.md)**

## Overview

This workshop provides a hands-on introduction to RAG through progressive examples, from a basic chat application to sophisticated retrieval systems. Designed for beginners, it can be completed in approximately 1.5 hours.

## Workshop Stages

See [slides/slides.pdf](slides/slides.pdf) for the workshop slides.

## Prerequisites

- Node.js installed (v14+ recommended)
- Ollama installed
- Basic familiarity with JavaScript
- Text editor or IDE

For system setup see:
- [Workshop Requirements EN](workshop_requirements_rag_en.txt) (English)
- [Workshop Requirements JA](workshop_requirements_rag_ja.txt) （日本語）

## Project Structure

```
RAGTutorial/
├── README.md                     # This file
├── workshop_requirements_en.md   # Requirements (English)
├── workshop_requirements_ja.md   # Requirements (Japanese)
├── docs/                         # Sample documents for RAG
│   ├── ADD_YOUR_OWN_DOCS_HERE.md
│   ├── lost-signal-of-elara-7_en.md
│   └── lost-signal-of-elara-7_ja.md
├── slides/                       # Workshop slides
├── 01-basic-chat/                # Simple chat with Ollama
├── 02-function-calling/          # Function-calling example
├── 03-basic-rag/                 # Simple RAG using Ollama
├── 04-function-rag-decision/     # Function-calling for RAG
└── 05-agent-rag-decision/        # Agentic RAG
```

## Getting Started

1. Clone this repository
2. Using Ollama from the command line, get the model you want to use:
   ```
   ollama pull qwen2.5:3b
   ollama pull nomic-embed-text
   ```
3. Install common dependencies first:
   ```
   cd common
   npm install
   ```
4. Then install dependencies for the example you want to run:
   ```
   cd ../01-basic-chat
   npm install
   ```
5. Start the server:
   ```
   npm start
   ```
6. Open http://localhost:3000 in your browser

If you want to use a different model, copy the `.env.example` file to `.env` and set the model name. Example:

```
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434

MODEL_NAME=qwen2.5:7b # Change this to a model you have installed

EMBEDDING_MODEL_NAME=nomic-embed-text
```

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Ollama Project](https://ollama.ai/)
- [Node.js Documentation](https://nodejs.org/en/docs/)


## Contact

*Davide Pasca*:
- [davide@newtypekk.com](mailto:davide@newtypekk.com)
- [github.com/dpasca](https://github.com/dpasca)
- [newtypekk.com](https://newtypekk.com)
- [x.com/109mae](https://x.com/109mae)