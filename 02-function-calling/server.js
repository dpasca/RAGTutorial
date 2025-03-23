require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { OpenAI } = require('openai');

// Initialize Express app
const app = express();
const port = 3000;

//=======================================================
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
// Simple in-memory conversation history for the demo
const conversationHistory = [];

// Avoid history growing too large
function trimConversationHistory()
{
  if (conversationHistory.length > 20)
    conversationHistory.splice(0, 4);
}

//=======================================================
// Define function for getting movie ratings
const getMovieRatingFunction = {
  name: "get_movie_rating",
  description: "Get the rating of a movie from our database",
  parameters: {
    type: "object",
    properties: {
      movieTitle: {
        type: "string",
        description: "The title of the movie to look up"
      }
    },
    required: ["movieTitle"]
  }
};

//=======================================================
// Function to execute the movie rating lookup
function getMovieRating(movieTitle)
{
  // Get numerical hash of movie title, and calculate a made-up rating
  const hash = crypto.createHash('sha256').update(movieTitle).digest('hex');
  const rating = ((parseInt(hash.slice(0, 4), 16) % 50)) / 10.0;
  return rating;
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
function executeToolCall(call)
{
  // Is the function name what we expect ?
  if (call.function.name === "get_movie_rating")
  {
    // Parse the function arguments
    const args = JSON.parse(call.function.arguments);

    // Call the actual function here !
    const movieRating = getMovieRating(args.movieTitle);
    console.log(`Called get_movie_rating: ${args.movieTitle} -> ${movieRating}`);

    // Create a tool call message with the result
    const toolCallReply = {
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(movieRating)
    };

    console.log(`Tool call reply: ${JSON.stringify(toolCallReply)}`);

    return toolCallReply;
  }

  console.warning(`Unknown function call: ${call.function.name}`);
  return null;
}

//=======================================================
async function handleToolCalls(assistantMessage, messages, userMessage)
{
  if (assistantMessage.tool_calls.length > 1)
    console.warning(`Multiple tool calls detected, only the first one will be executed`);

  const call = assistantMessage.tool_calls[0];

  console.log(`Function call detected for ${call.function.name}`);

  // Resolve the function call
  const toolCallReply = executeToolCall(call);
  // ...if the function call was resolved, then "secondMessages" will be an array
  if (toolCallReply)
  {
    console.log(`Function call resolved for ${call.function.name}`);

    const messagesWithToolCall = [
      ...messages,
      assistantMessage,
      toolCallReply,
    ];

    console.log(`Calling LLM with function call result`);

    // Call the API _again_, but with the function response
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
// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const userMessage = message;

    if (!userMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Create messages array with conversation history
    const messages = [
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    // Call LLM API with function calling and conversation history
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: 0.7,
      tools: [{ type: "function", function: getMovieRatingFunction }],
      tool_choice: "auto"
    });

    const assistantMessage = completion.choices[0].message;

    // Check if the model wants to call a function
    if (assistantMessage.tool_calls)
    {
      const newAssistantMessage = await handleToolCalls(assistantMessage, messages, userMessage);
      if (newAssistantMessage)
        return res.json({ response: newAssistantMessage.content });
    }

    // If no function call, just add to history and return the response
    conversationHistory.push({ role: "user", content: userMessage });
    conversationHistory.push({ role: "assistant", content: assistantMessage.content });
    trimConversationHistory(); // Limit history size

    return res.json({ response: assistantMessage.content });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: 'An error occurred',
      details: error.message
    });
  }
});

//=======================================================
// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
