# RAG Tutorial Workshop

A step-by-step tutorial for building and understanding Retrieval-Augmented Generation (RAG) systems using Node.js.

## Overview

This workshop provides a hands-on introduction to RAG through progressive examples, from a basic chat application to sophisticated retrieval systems. Designed for beginners, it can be completed in approximately 1.5 hours.

## Prerequisites

- Node.js installed (v14+ recommended)
- OpenAI API key
- Basic familiarity with JavaScript
- Text editor or IDE

## Project Structure

```
RAGTutorial/
├── README.md                     # Workshop instructions
├── docs/                         # Sample documents for RAG
│   ├── ADD_YOUR_OWN_DOCS_HERE.md
│   ├── lost-signal-of-elara-7_en.md
│   └── lost-signal-of-elara-7_ja.md
├── 01-basic-chat/                # Simple completion
├── 02-function-calling/          # Movie rating function
├── 03-basic-rag/                 # Simple RAG using Ollama
├── 04-function-rag-decision/     # Using functions to trigger RAG
└── 05-two-step-completion/       # Plain completion for RAG decisions
```

## Workshop Stages

### Stage 1: Basic Chat (No RAG)

**Objective:** Create a simple chat interface using OpenAI completions API.

**Features:**
- Express server with REST API
- Basic HTML/CSS chat interface
- Using Ollama via OpenAI API compatible endpoint

**Key Concepts:**
- Setting up an AI chat application
- Managing API requests and responses

### Stage 2: Function Calling

**Objective:** Enhance the chat with function calling for movie ratings.

**Features:**
- Function definitions for the LLM
- Movie rating (fake) database integration

**Key Concepts:**
- OpenAI function calling
- Structuring functions for LLM use
- Parsing and handling function responses

### Stage 3: Basic RAG

**Objective:** Implement the core RAG pattern with LlamaIndex.

**Features:**
- Document loading and processing
- Vector embedding and storage
- Context retrieval and prompt augmentation

**Key Concepts:**
- Document chunking and indexing
- Semantic search and similarity
- Context window management

### Stage 4: Function-Based RAG Decision

**Objective:** Use function calling to intelligently decide when to use RAG.

**Features:**
- Decision function for retrieval necessity
- Conditional RAG execution
- Performance optimization

**Key Concepts:**
- Meta-reasoning with LLMs
- Hybrid processing pipelines
- Optimizing for relevance and performance

### Stage 5: Two-Step Completion

**Objective:** Separate the RAG decision and execution using a two-step approach.

**Features:**
- Initial query analysis completion
- JSON response parsing
- Conditional context augmentation

**Key Concepts:**
- Multi-stage prompting
- Structured LLM outputs
- Building more flexible RAG systems

## Getting Started

1. Clone this repository
2. Using Ollama from the command line, get the model you want to use:
   ```
   ollama pull qwen2.5:3b
   ollama pull all-minilm:l6-v2
   ```
3. Install dependencies for the example you want to run:
   ```
   cd 01-basic-chat
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open http://localhost:3000 in your browser

If you want to use a different model, copy the `.env.example` file to `.env` and set the model name. Example:

```
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434

MODEL_NAME=llama3 # Change this to a model you have installed

EMBEDDING_MODEL_NAME=all-minilm:l6-v2
```

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Ollama Project](https://ollama.ai/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
