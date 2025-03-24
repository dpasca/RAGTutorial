---
marp: true
theme: default
paginate: true
backgroundColor: #fff
---

# Retrieval-Augmented Generation (RAG) Workshop

A step-by-step guide to building and understanding RAG systems

by Davide Pasca

(2025/03)

---

# What is RAG?

**Retrieval-Augmented Generation (RAG)**:

- Fast fuzzy search + LLM intelligence
- <Add Japanese>

**Benefits:**
- Extends knowledge of LLM to any document database
- <Add Japanese>
- Language model can be small
- <Add Japanese>
- Reliable responses (can mention sources)
- <Add Japanese>

---

# Workshop Overview

A progressive approach to understanding and implementing RAG:

1. **Basic Chat** - Simple AI chat (no RAG) (<Add Japanese>)
2. **Function Calling** - AI chat with function-calling (<Add Japanese>)
3. **Basic RAG** - Basic RAG pattern (<Add Japanese>)
4. **Function-Based RAG Decision** - RAG with function-calling (<Add Japanese>)
5. **Agentic RAG Decision** - RAG with agents (<Add Japanese>)

---

# Stage 1: Basic Chat

**Objective:** Create a simple chat interface using OpenAI API

<!-- ![bg right:40% 90%](https://source.unsplash.com/rH8O0FHFpfw) -->

**Features:**
- Chat with Express server and REST API (<Add Japanese>)
- Using Ollama via OpenAI API compatible endpoint (<Add Japanese>)

**Key Concepts:**
- De-facto standard "completions" API by OpenAI (<Add Japanese>)
- Access to Ollama models via this endpoint (<Add Japanese>)
---

# Stage 1: Basic Chat (continued)

1. Create a list of messages between "user" and "assistant"
  <Add Japanese>
2. On user input, add new "user" messages to the history
  <Add Japanese>
3. Call Completions API with all messages
  <Add Japanese>
4. Get "assistant" response and add it to the history
  <Add Japanese>
5. Wait for next user input and repeat...
  <Add Japanese>

---

# Stage 2: Function Calling

**Objective:** Enhance the chat with function calling capabilities

```javascript
// Define a function for the LLM to call
const getMovieRatingFunction = {
  name: "get_movie_rating",
  description: "Get the rating for a movie",
  parameters: {
    type: "object",
    properties: {
      movieTitle: {
        type: "string",
        description: "The title of the movie"
      }
    },
    required: ["movieTitle"]
  }
};
```

**Key Concepts:**
- OpenAI function calling
- Structuring functions for LLM use
- Parsing and handling function responses

---

# Stage 3: Basic RAG

**Objective:** Implement the core RAG pattern from scratch

![bg right:40% 80%](https://source.unsplash.com/OQMZwNd3ThU)

**Features:**
- Document loading and processing
- Vector embedding and storage
- Context retrieval and prompt augmentation

**Key Concepts:**
- Document chunking and indexing
- Semantic search and similarity
- Context window management

---

# Stage 4: Function-Based RAG Decision

**Objective:** Use function-calling to intelligently decide when to use RAG

```javascript
// Define RAG search tool
const searchKnowledgeBaseFunction = {
  name: "search_knowledge_base",
  description: "Search through the knowledge base for relevant information",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The query to search for"
      }
    },
    required: ["query"]
  }
};
```

**Key Concepts:**
- Meta-reasoning with LLMs
- Hybrid processing pipelines
- Optimizing for relevance and performance

---

# Stage 5: Agentic RAG Decision

**Objective:** Use an agent to decide when to use RAG

![bg right:40% 80%](https://source.unsplash.com/ipARHaxETRk)

**Features:**
- Initial query analysis completion
- Conditional context augmentation
- Multiple reasoning steps

**Key Concepts:**
- Multi-stage prompting
- Building more flexible RAG systems
- Agent-based decision making

---

# Implementation Architecture

<div style="display: flex; justify-content: center; align-items: center;">
  <img src="images/rag_architecture.png" alt="RAG Architecture" style="max-width: 100%; height: auto;">
</div>

---

# Example Application

<div style="display: flex; justify-content: center; align-items: center;">
  <img src="images/rag_comparison.png" alt="RAG Comparison" style="max-width: 90%; height: auto;">
</div>

Our sample document "The Lost Signal of Elara-7" demonstrates how RAG enhances LLM responses:

- Without RAG: Generic responses based on training data
- With RAG: Specific responses incorporating details about:
  - Mining colony on Elara-7
  - Chief Engineer Mara Kade's last message
  - The mysterious crystalline structures
  - The Icarus Dawn investigation team

---

# Getting Started

```bash
# Clone this repository
git clone https://github.com/yourusername/RAGTutorial.git

# Get the required Ollama models
ollama pull qwen2.5:3b
ollama pull nomic-embed-text

# Navigate to an example and install dependencies
cd 01-basic-chat
npm install

# Start the server
npm start

# Open http://localhost:3000 in your browser
```

---

# Thank You!

**Resources:**
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Ollama Project](https://ollama.ai/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

**Contact:**
Davide Pasca
- [davide@newtypekk.com](mailto:davide@newtypekk.com)
- [x.com/109mae](https://x.com/109mae)
