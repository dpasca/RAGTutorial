require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const { globSync } = require('glob');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

//=======================================================
// Initialize clients
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const embeddingModel = process.env.EMBEDDING_MODEL_NAME || "all-minilm:l6-v2";
const modelName = process.env.MODEL_NAME || "qwen2.5:3b";
const useOllama = process.env.USE_OLLAMA !== "false";

// Initialize OpenAI client (works with Ollama too)
const openai = new OpenAI({
  baseURL: useOllama ? `${ollamaBaseUrl}/v1` : undefined,
  apiKey: useOllama ? "ollama" : process.env.OPENAI_API_KEY,
});

// Function to create a local in-memory embeddings database
let inMemoryVectorStore = {};

//=======================================================
// Function to split text into chunks
function splitIntoChunks(text, maxChunkSize = 500) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = "";
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += sentence + " ";
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

//=======================================================
// Function to get embeddings from Ollama
async function getEmbeddings(texts) {
  const embeddings = [];

  for (const text of texts) {
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });

    embeddings.push(response.data[0].embedding);
  }

  return embeddings;
}

//=======================================================
// Function to calculate cosine similarity between vectors
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}

//=======================================================
// Function to search for similar documents
async function searchSimilarDocuments(queryEmbedding, topK = 3) {
  if (Object.keys(inMemoryVectorStore).length === 0) {
    return { documents: [], scores: [], metadatas: [] };
  }

  // Calculate similarity scores
  const results = Object.entries(inMemoryVectorStore).map(([id, item]) => {
    const similarity = cosineSimilarity(queryEmbedding, item.embedding);
    return {
      id,
      document: item.document,
      metadata: item.metadata,
      score: similarity
    };
  });

  // Sort by similarity score (highest first)
  results.sort((a, b) => b.score - a.score);

  // Take topK results
  const topResults = results.slice(0, topK);

  return {
    documents: topResults.map(r => r.document),
    scores: topResults.map(r => r.score),
    metadatas: topResults.map(r => r.metadata)
  };
}

//=======================================================
// Function to initialize the document store
async function initializeDocumentStore() {
  console.log('Initializing document store...');

  try {
    // We'll use a simple in-memory vector store instead of ChromaDB
    // to make the example simpler and avoid external dependencies
    console.log('Using in-memory vector store');

    // Load documents from the docs directory
    const docsDir = path.join(__dirname, '../docs');
    const docFiles = globSync('**/*.md', { cwd: docsDir });

    console.log(`Found ${docFiles.length} documents to index`);

    for (const file of docFiles) {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = splitIntoChunks(content);

      console.log(`Processing ${file}: ${chunks.length} chunks`);

      // Get embeddings for chunks
      const embeddings = await getEmbeddings(chunks);

      // Add documents to in-memory store
      for (let i = 0; i < chunks.length; i++) {
        const id = uuidv4();
        inMemoryVectorStore[id] = {
          document: chunks[i],
          embedding: embeddings[i],
          metadata: { source: file }
        };
      }
    }

    console.log('Documents indexed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing document store:', error);
    return false;
  }
}

// API endpoint for RAG-based chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Make sure document store is initialized
    if (Object.keys(inMemoryVectorStore).length === 0) {
      return res.status(503).json({
        error: 'Document store is still initializing. Please try again in a moment.'
      });
    }

    // Generate embedding for the query
    const queryEmbedding = await getEmbeddings([message]);

    // Query the in-memory vector store for similar documents
    const queryResult = await searchSimilarDocuments(queryEmbedding[0], 3);

    // Get the retrieved documents
    const retrievedDocuments = queryResult.documents || [];
    const retrievedContext = retrievedDocuments.join('\n\n');
    const documentScores = queryResult.scores || [];
    const documentMetadatas = queryResult.metadatas || [];

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


// Start the server and initialize the document store
app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);

  try {
    const initialized = await initializeDocumentStore();
    if (!initialized) {
      console.error('Failed to initialize document store. The application may not work correctly.');
    }
  } catch (error) {
    console.error('Error during startup:', error);
  }
});