require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const {
  SimpleDirectoryReader,
  VectorStoreIndex,
  serviceContextFromDefaults,
  OpenAIEmbedding
} = require('llamaindex');

// Initialize Express app
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI client for direct API calls
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Set up LlamaIndex
let index; // Will hold our document index

// Function to initialize the index
async function initializeIndex() {
  try {
    console.log('Initializing document index...');

    // Set up the OpenAI service context
    const serviceContext = serviceContextFromDefaults({
      llm: {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        apiKey: process.env.OPENAI_API_KEY,
      },
      embedModel: new OpenAIEmbedding({
        apiKey: process.env.OPENAI_API_KEY
      })
    });

    // Read documents from the docs directory
    const reader = new SimpleDirectoryReader();
    const documents = await reader.loadData('../docs');
    console.log(`Loaded ${documents.length} documents`);

    // Create a vector store index from the documents
    index = await VectorStoreIndex.fromDocuments(documents, { serviceContext });
    console.log('Index created successfully');
  } catch (error) {
    console.error('Error initializing index:', error);
  }
}

// API endpoint for RAG-based chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Make sure index is initialized
    if (!index) {
      return res.status(503).json({
        error: 'Document index is still initializing. Please try again in a moment.'
      });
    }

    // Perform retrieval to get relevant context
    const queryEngine = index.asQueryEngine();
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

    // Call OpenAI API with the augmented prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
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

// Start the server and initialize the index
app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log('Make sure you have set your OPENAI_API_KEY in the .env file');
  await initializeIndex();
});
