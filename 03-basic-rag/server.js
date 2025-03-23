require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const { VectorStore } = require('../common/vectorStore');

// Initialize Express app
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//=======================================================
function initializeClient()
{
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const useOllama = process.env.USE_OLLAMA !== "false";

  // Initialize OpenAI client (works with Ollama too)
  return new OpenAI({
    baseURL: useOllama ? `${ollamaBaseUrl}/v1` : undefined,
    apiKey: useOllama ? "ollama" : process.env.OPENAI_API_KEY,
  });
}

//=======================================================
// Get model name from environment or use appropriate default
function getModelName() {
  const useOllama = process.env.USE_OLLAMA !== "false";
  return process.env.MODEL_NAME || (useOllama ? "qwen2.5:3b" : "gpt-4o-mini");
}

//=======================================================
// Initialize the client
const openai = initializeClient();
const modelName = getModelName();
console.log(`Using model: ${modelName}`);

//=======================================================
// Initialize the vector store
const embeddingModel = process.env.EMBEDDING_MODEL_NAME || "all-minilm:l6-v2";
const vectorStore = new VectorStore(openai, embeddingModel);

//=======================================================
// Function to initialize the document store
async function initializeDocumentStore() {
  // Load documents from the docs directory
  const docsDir = path.join(__dirname, '../docs');

  // Initialize the vector store with documents from the directory
  await vectorStore.initializeFromDirectory(docsDir);
}

//=======================================================
// API endpoint for RAG-based chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Make sure document store is initialized
    if (vectorStore.isEmpty()) {
      return res.status(503).json({
        error: 'Document store is still initializing. Please try again in a moment.'
      });
    }

    // Search for similar documents using the vector store
    const queryResult = await vectorStore.search(message, 3);

    // Get the retrieved documents
    const retrievedDocuments = queryResult.documents || [];
    const retrievedContext = retrievedDocuments.join('\n\n');
    const documentScores = queryResult.scores || [];
    const documentMetadatas = queryResult.metadatas || [];

    // Create a prompt that explains how to use the additional context
    // Small language models tend to be too eager to use the additional context
    //  so we need to be strong about being selective about using it
    const systemPrompt = `
You are a helpful assistant.
At the bottom of the user's message, there may be some "additional context".
Never mention the additional context to the user.
Never use the additional context in your answer, unless it's relevant to the user's question.
`;

    // Create a prompt that includes the retrieved context
    const prompt = `${message}

---
Additional context:
${retrievedContext}
`;

    // Call LLM API with the augmented prompt
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "system", content: systemPrompt },
                 { role: "user", content: prompt }],
      temperature: 0.7,
    });

    // Extract and send the response with metadata
    const aiResponse = completion.choices[0].message.content;

    res.json({
      response: aiResponse,
      metadata: {
        retrievedDocuments: retrievedDocuments.map((text, i) => ({
          text: text.length > 150 ? text.substring(0, 150) + '...' : text,
          score: documentScores[i],
          source: documentMetadatas[i]?.source
        }))
      }
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: 'An error occurred',
      details: error.message
    });
  }
});

//=======================================================
// Start the server and initialize the document store
app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);

  try {
    await initializeDocumentStore();
  } catch (error) {
    console.error('Error during startup:', error);
  }
});
