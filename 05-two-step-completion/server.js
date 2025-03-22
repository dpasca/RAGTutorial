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

// Initialize OpenAI client
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

// API endpoint for chat
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

    // First step: Use a completion to decide if RAG is needed
    // This uses a structured output format (JSON) rather than function calling
    const analyzerPrompt = `
You are a query analyzer that determines if a retrieval step is needed to answer user questions.
Our knowledge base contains information about: AI history, quantum computing, and nutrition facts.

Analyze the following user query and determine if we should retrieve information from our knowledge base:

"${message}"

Reply with a JSON object with the following structure:
{
  "needsRetrieval": boolean, // true if retrieval is needed, false otherwise
  "rationale": string, // brief explanation of the decision
  "topicsToRetrieve": [string], // array of key topics to search for (optional)
}

Only respond with valid JSON.
`;

    const analyzerCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: analyzerPrompt }],
      temperature: 0.1, // Low temperature for more consistent structured output
    });

    // Parse the JSON response
    let ragDecision;
    try {
      const analyzerResponse = analyzerCompletion.choices[0].message.content;
      ragDecision = JSON.parse(analyzerResponse);
    } catch (error) {
      console.error('Error parsing analyzer response:', error);

      // Fallback in case of parsing errors
      ragDecision = {
        needsRetrieval: true,
        rationale: "Failed to parse analyzer response. Using retrieval as a fallback.",
        topicsToRetrieve: []
      };
    }

    let finalResponse;
    let retrievalMetadata = null;

    if (ragDecision.needsRetrieval) {
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

      finalResponse = completion.choices[0].message.content;

      // Include retrieval metadata
      retrievalMetadata = {
        retrievedDocuments: retrievalResult.sourceNodes.map(node => ({
          text: node.text.substring(0, 150) + '...',
          score: node.score
        }))
      };
    } else {
      // If RAG is not needed, just call the API directly
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }],
        max_tokens: 500,
        temperature: 0.7,
      });

      finalResponse = completion.choices[0].message.content;
    }

    // Return the response with the RAG decision and any retrieval metadata
    res.json({
      response: finalResponse,
      ragDecision: ragDecision,
      metadata: retrievalMetadata
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
