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
│   ├── ai_history.txt
│   ├── quantum_computing.txt
│   └── nutrition_facts.txt
├── 01-basic-chat/                # Simple completion
├── 02-function-calling/          # Movie rating function
├── 03-basic-rag/                 # Simple RAG with LlamaIndex
├── 04-function-rag-decision/     # Using functions to trigger RAG
└── 05-two-step-completion/       # Plain completion for RAG decisions
```

## Workshop Stages

### Stage 1: Basic Chat (15 minutes)

**Objective:** Create a simple chat interface using OpenAI completions API.

**Features:**
- Express server with REST API
- Basic HTML/CSS chat interface
- OpenAI API integration

**Key Concepts:**
- Setting up an AI chat application
- Managing API requests and responses
- Basic prompt engineering

### Stage 2: Function Calling (15 minutes)

**Objective:** Enhance the chat with function calling for movie ratings.

**Features:**
- Function definitions for the LLM
- Movie rating database integration
- UI enhancements to display ratings

**Key Concepts:**
- OpenAI function calling
- Structuring functions for LLM use
- Parsing and handling function responses

### Stage 3: Basic RAG (20 minutes)

**Objective:** Implement the core RAG pattern with LlamaIndex.

**Features:**
- Document loading and processing
- Vector embedding and storage
- Context retrieval and prompt augmentation

**Key Concepts:**
- Document chunking and indexing
- Semantic search and similarity
- Context window management

### Stage 4: Function-Based RAG Decision (20 minutes)

**Objective:** Use function calling to intelligently decide when to use RAG.

**Features:**
- Decision function for retrieval necessity
- Conditional RAG execution
- Performance optimization

**Key Concepts:**
- Meta-reasoning with LLMs
- Hybrid processing pipelines
- Optimizing for relevance and performance

### Stage 5: Two-Step Completion (20 minutes)

**Objective:** Separate the RAG decision and execution using a two-step approach.

**Features:**
- Initial query analysis completion
- JSON response parsing
- Conditional context augmentation

**Key Concepts:**
- Multi-stage prompting
- Structured LLM outputs
- Building more flexible RAG systems

### Bonus: Ollama Integration (if time permits)

**Objective:** Switch from OpenAI to local Ollama models.

**Features:**
- Local model setup
- API compatibility layer
- Performance considerations

**Key Concepts:**
- Working with open-source models
- API differences between providers
- Local vs. cloud deployment tradeoffs

## Getting Started

1. Clone this repository
2. Create a `.env` file in each project directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
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

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [LlamaIndex Documentation](https://docs.llamaindex.ai/)
- [Ollama Project](https://ollama.ai/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
