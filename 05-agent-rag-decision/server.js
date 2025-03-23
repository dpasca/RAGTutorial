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
// A model name for the "agent" working behind the scenes
// In our case we use the same model, but a simpler model
//  might be sufficient for this role
function getAgentModelName() {
  const useOllama = process.env.USE_OLLAMA !== "false";
  return process.env.MODEL_NAME || (useOllama ? "qwen2.5:3b" : "gpt-4o-mini");
}

//=======================================================
// Initialize the client
const openai = initializeClient();
const modelName = getModelName();
const agentModelName = getAgentModelName();
console.log(`Using model: ${modelName}`);
console.log(`Using agent model: ${agentModelName}`);

//=======================================================
// Initialize the vector store
const embeddingModel = process.env.EMBEDDING_MODEL_NAME || "nomic-embed-text";
const vectorStore = new VectorStore(openai, embeddingModel);

// Simple in-memory conversation history for the demo
const conversationHistory = [];

// Avoid history growing too large
function trimConversationHistory()
{
  if (conversationHistory.length > 20)
    conversationHistory.splice(0, 4);
}

//=======================================================
// Function to initialize the document store
async function initializeDocumentStore() {
  // Load documents from the docs directory
  const docsDir = path.join(__dirname, '../docs');

  // Initialize the vector store with documents from the directory
  await vectorStore.initializeFromDirectory(docsDir);
}

//=======================================================
// API endpoint to reset conversation history
app.post('/api/chat/reset', (req, res) => {
  // Clear the conversation history
  conversationHistory.length = 0;

  // Send success response
  res.json({ success: true, message: 'Conversation history has been reset' });
});

//=======================================================
async function getAgentResponse(userMessage)
{
  const agentSystemPrompt = `
You are a support agent with access to a knowledge base.
Your job is to generate a search query for the benefit of the
assistant that will respond to the user.
You do not respond to the user, you only generate the search query.
Given the context, think about what the user is asking for
and if the reply may require some additional context from the
knowledge base, then generate a search query with the following format:

search_knowledge_base: <search query>

If the user's question is something trivial or that may not require
additional context from the knowledge base, then respond with:

NO_SEARCH
`;

  // Trim the history to the last 3 messages
  const recentConversation = conversationHistory.slice(-3);

  const messages = [
    { role: "system", content: agentSystemPrompt },
    ...recentConversation,
    { role: "user", content: userMessage }
  ];

  const completion = await openai.chat.completions.create({
    model: agentModelName,
    messages: messages,
    temperature: 0.7,
  });

  const agentResponse = completion.choices[0].message.content;

  console.log(`Agent response: ${agentResponse}`);

  if (agentResponse.startsWith("search_knowledge_base:")) {
    const searchQuery = agentResponse.substring("search_knowledge_base:".length).trim();
    return searchQuery;
  }

  return null;
}


//=======================================================
// API endpoint for RAG-based chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const userMessage = message;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let retrievedDocuments = [];
    let retrievedContext = '';
    let documentScores = [];
    let documentMetadatas = [];

    const searchQuery = await getAgentResponse(userMessage);
    if (searchQuery)
    {
      // Make sure document store is initialized
      if (vectorStore.isEmpty()) {
        return res.status(503).json({
          error: 'Document store is still initializing. Please try again in a moment.'
        });
      }

      const queryResult = await vectorStore.search(searchQuery, 3);
      // Get the retrieved documents
      retrievedDocuments = queryResult.documents || [];
      retrievedContext = retrievedDocuments.join('\n\n');
      documentScores = queryResult.scores || [];
      documentMetadatas = queryResult.metadatas || [];
    }

    // Create a prompt that explains how to use the additional context
    // Small language models tend to be too eager to use the additional context
    //  so we need to be strong about being selective about using it
    const systemPrompt = `
You are a helpful assistant.
At the bottom of the user's message, there may be some "additional context".
Never mention the additional context to the user.
Never use the additional context in your answer, unless it's relevant to the user's question.
`;

    // Basic prompt is just the user's message
    let prompt = userMessage;

    // If we have retrieved context, add it to the prompt
    if (retrievedContext)
    {
      prompt += `

---
Additional context:
${retrievedContext}
`;
    }

    // Create messages array with system prompt and conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: prompt }
    ];

    // Call LLM API with the conversation history and augmented prompt
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: 0.7,
    });

    // Extract and send the response with metadata
    const assistantMessage = completion.choices[0].message;

    // Add the user and assistant messages to the conversation history
    conversationHistory.push({ role: "user", content: userMessage });
    conversationHistory.push({ role: "assistant", content: assistantMessage.content });
    trimConversationHistory();

    res.json({
      response: assistantMessage.content,
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
