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
// Define RAG search tool
const searchKnowledgeBaseFunction = {
  name: "search_knowledge_base",
  description: "Search through the knowledge base for relevant information. Use this when you're unsure about the answer.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The query to search for"
      },
      limit: {
        type: "integer",
        description: "Maximum number of documents to retrieve (default: 3)"
      }
    },
    required: ["query"]
  }
};

//=======================================================
// Function to execute RAG search
async function searchKnowledgeBase(query, limit = 3) {
  // Make sure document store is initialized
  if (vectorStore.isEmpty()) {
    throw new Error('Document store is still initializing');
  }

  // Search for similar documents using the vector store
  const queryResult = await vectorStore.search(query, limit);

  return {
    documents: queryResult.documents || [],
    scores: queryResult.scores || [],
    metadatas: queryResult.metadatas || []
  };
}

//=======================================================
// Function to execute tool calls
async function executeToolCall(call)
{
  // Is the function name what we expect?
  if (call.function.name === "search_knowledge_base")
  {
    let returnContent = null;

    try {
      // Parse the function arguments
      const args = JSON.parse(call.function.arguments);
      const limit = args.limit || 3;

      // Call the actual function here
      const searchResults = await searchKnowledgeBase(args.query, limit);
      console.log(`Called search_knowledge_base for: ${args.query} -> ${searchResults.documents.length} results`);

      // Good content to return
      returnContent = searchResults;

      console.log(`Tool call reply created for ${call.function.name}`);
    }
    catch (error)
    {
      console.error(`Error executing ${call.function.name}:`, error);
      // Return an error message as "content"
      returnContent = JSON.stringify({ error: error.message });
    }

    // Create a tool call message with the result
    const toolCallReply = {
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify(returnContent)
    };

    return toolCallReply;
  }

  console.warn(`Unknown function call: ${call.function.name}`);
  return null;
}

//=======================================================
// Handle tool calls
async function handleToolCalls(assistantMessage, messages, userMessage) {
  if (assistantMessage.tool_calls.length > 1)
    console.warn(`Multiple tool calls detected, only the first one will be executed`);

  const call = assistantMessage.tool_calls[0];

  console.log(`Function call detected for ${call.function.name}`);

  // Resolve the function call
  const toolCallReply = await executeToolCall(call);

  // If the function call was resolved
  if (toolCallReply) {
    console.log(`Function call resolved for ${call.function.name}`);

    const messagesWithToolCall = [
      ...messages,
      assistantMessage,
      toolCallReply,
    ];

    console.log(`Calling LLM with function call result`);

    // Call the API again, but with the function response
    const newCompletion = await openai.chat.completions.create({
      model: modelName,
      messages: messagesWithToolCall,
      temperature: 0.7
    });

    // The new assistant message, after the function call
    const newAssistantMessage = newCompletion.choices[0].message;

    // Store the full conversation including function calls in history
    conversationHistory.push({role: "user", content: userMessage});
    conversationHistory.push(assistantMessage);
    conversationHistory.push(toolCallReply);
    conversationHistory.push({role: "assistant", content: newAssistantMessage.content});
    trimConversationHistory(); // Limit history size

    return newAssistantMessage;
  }

  return null;
}

//=======================================================
// API endpoint for chat with RAG as a tool
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const userMessage = message;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create a system prompt that explains how to use the RAG tool
    const systemPrompt = `
You are a helpful assistant with access to a knowledge base.
When you're unsure about the answer, first use the search_knowledge_base tool.
Never mention the available tools to the user.
Tools are a private internal implementation detail that do not concern the user.
`;

    // Create messages array with system prompt and conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    // Call LLM API with function calling and conversation history
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: 0.7,
      tools: [{ type: "function", function: searchKnowledgeBaseFunction }],
      tool_choice: "auto"
    });

    // Extract the assistant message
    const assistantMessage = completion.choices[0].message;

    // Check if the model wants to call a function
    if (assistantMessage.tool_calls) {
      const newAssistantMessage = await handleToolCalls(assistantMessage, messages, userMessage);
      if (newAssistantMessage) {
        // Extract the RAG results from the tool call reply
        let retrievedDocuments = [];
        let documentScores = [];
        let documentMetadatas = [];

        // Find the tool reply in conversation history (it was just added)
        const toolReplyIndex = conversationHistory.findIndex(msg =>
          msg.role === "tool" && msg.tool_call_id === assistantMessage.tool_calls[0].id
        );

        if (toolReplyIndex !== -1) {
          try {
            const toolResults = JSON.parse(conversationHistory[toolReplyIndex].content);
            retrievedDocuments = toolResults.documents || [];
            documentScores = toolResults.scores || [];
            documentMetadatas = toolResults.metadatas || [];
          } catch (e) {
            console.error("Error parsing tool results:", e);
          }
        }

        return res.json({
          response: newAssistantMessage.content,
          metadata: {
            ragUsed: true,
            retrievedDocuments: retrievedDocuments.map((text, i) => ({
              text: text.length > 150 ? text.substring(0, 150) + '...' : text,
              score: documentScores[i],
              source: documentMetadatas[i]?.source
            }))
          }
        });
      }
    }

    // If no function call, just add to history and return the response
    conversationHistory.push({ role: "user", content: userMessage });
    conversationHistory.push({ role: "assistant", content: assistantMessage.content });
    trimConversationHistory(); // Limit history size

    return res.json({
      response: assistantMessage.content,
      metadata: {
        ragUsed: false
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
