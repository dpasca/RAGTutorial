# Basic RAG (Retrieval-Augmented Generation) with In-Memory Vector Store and Ollama

This example demonstrates a simple RAG implementation using In-Memory Vector Store and Ollama for embeddings and text generation.

## Setup

1. Make sure you have [Ollama](https://ollama.ai/) installed and running on your machine
2. Install the required dependencies:
   ```
   npm install
   ```
3. Copy the example environment file and customize as needed:
   ```
   cp .env.example .env
   ```
4. Put your documents (markdown files) in the `/docs` directory in the root of the project
5. Start the server:
   ```
   npm run dev
   ```
6. Open http://localhost:3000 in your browser

## How it works

1. **Document Processing**: 
   - Text documents are loaded from the `/docs` directory
   - Documents are split into smaller chunks for better retrieval
   - Embeddings are generated for each chunk using Ollama
   - Chunks and embeddings are stored in In-Memory Vector Store

2. **Retrieval**:
   - When a user asks a question, an embedding is generated for the query
   - In-Memory Vector Store finds the most semantically similar document chunks
   - These chunks provide context for the answer

3. **Generation**:
   - The retrieved document chunks are sent to the LLM along with the user's question
   - The LLM generates a response based on the provided context

## Configuration

Edit the `.env` file to configure:
- `USE_OLLAMA`: Set to "true" to use Ollama, "false" to use OpenAI
- `OLLAMA_BASE_URL`: URL where Ollama is running
- `MODEL_NAME`: LLM model to use for text generation
- `EMBEDDING_MODEL_NAME`: Model to use for generating embeddings
- `OPENAI_API_KEY`: Only needed if using OpenAI (when USE_OLLAMA=false)
