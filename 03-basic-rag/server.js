require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const {
  SimpleDirectoryReader,
  VectorStoreIndex,
  serviceContextFromDefaults,
  OpenAIEmbedding,
  OllamaEmbedding
} = require('llamaindex');

// Initialize Express app
const app = express();
const port = 3000;

//=======================================================
// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//=======================================================
// Initialize LLM client based on environment variables
function initializeClient()
{
  // Here we use OpenAI client, also for Ollama
  params = {};
  if (process.env.USE_OLLAMA !== "false")
  {
    console.log("Using Ollama. Make sure Ollama is running on your machine.");
    // Need to specify the base URL for Ollama
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    params = {
      baseURL: `${ollamaBaseUrl}/v1`,
      apiKey: "ollama", // Any non-empty string is fine here
    };
  }
  else
  {
    console.log("Using OpenAI. Make sure you have set your OPENAI_API_KEY in the .env file.");
    params = {apiKey: process.env.OPENAI_API_KEY};
  }
  // Return the OpenAI client
  return new OpenAI(params);
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

// Set up LlamaIndex
let _index; // Will hold our document index

//=======================================================
// Function to initialize the index
async function initializeIndex()
{
  console.log('Initializing document index...');

  const useOllama = process.env.USE_OLLAMA !== "false";
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  // Configure service context based on provider
  let serviceContextConfig = {
    llm: {
      model: modelName,
      temperature: 0.7,
    }
  };

  // Set up the embedding model and LLM configuration based on provider
  if (useOllama) {
    // For Ollama
    const embeddingModel = process.env.EMBEDDING_MODEL_NAME || "nomic-embed-text";
    console.log(`Using Ollama embedding model: ${embeddingModel}`);

    serviceContextConfig.llm.baseUrl = `${ollamaBaseUrl}/v1`;
    serviceContextConfig.embedModel = new OllamaEmbedding({
      modelName: embeddingModel,
      baseUrl: ollamaBaseUrl
    });
  } else {
    // For OpenAI
    console.log('Using OpenAI embeddings');

    serviceContextConfig.llm.apiKey = process.env.OPENAI_API_KEY;
    serviceContextConfig.embedModel = new OpenAIEmbedding({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  const serviceContext = serviceContextFromDefaults(serviceContextConfig);

  // Read documents from the docs directory
  const reader = new SimpleDirectoryReader();
  const documents = await reader.loadData('../docs');
  console.log(`Loaded ${documents.length} documents`);

  // Create a vector store index from the documents
  _index = await VectorStoreIndex.fromDocuments(documents, { serviceContext });
  console.log('Index created successfully');
}

//=======================================================
// API endpoint for RAG-based chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Make sure index is initialized
    if (!_index) {
      return res.status(503).json({
        error: 'Document index is still initializing. Please try again in a moment.'
      });
    }

    // Perform retrieval to get relevant context
    const queryEngine = _index.asQueryEngine();
    const retrievalResult = await queryEngine.query(message);

    // Get the text from the nodes that were retrieved
    const retrievedContext = retrievalResult.sourceNodes.map(node =>
      node.text
    ).join('\n\n');

    // Create a prompt that includes the retrieved context
    const prompt = `
I want you to answer the user's question based on the following context.
If the context doesn't contain relevant information to answer the question,
just say that you don't have enough information and answer based on your general knowledge.

Context:
${retrievedContext}

User question: ${message}
`;

    // Call LLM API with the augmented prompt
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    // Extract and send the response with metadata
    const aiResponse = completion.choices[0].message.content;

    res.json({
      response: aiResponse,
      metadata: {
        retrievedDocuments: retrievalResult.sourceNodes.map(node => ({
          text: node.text.substring(0, 150) + '...',
          score: node.score
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
// Start the server and initialize the index
app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);

  try {
    await initializeIndex();
  } catch (error) {
    console.error('Error initializing index:', error);
  }
});
