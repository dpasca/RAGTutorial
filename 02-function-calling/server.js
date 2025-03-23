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
function makeToolCallReply(assistantMessage)
{
  // Check if the model wants to call a function
  if (!assistantMessage.tool_calls)
    return null;

  const call = assistantMessage.tool_calls[0];

  console.log(`Function call detected for ${call.function.name}`);

  // Is the function name what we expect ?
  if (call.function.name === "get_movie_rating")
  {
    // Parse the function arguments
    const args = JSON.parse(call.function.arguments);
    const movieTitle = args.movieTitle;

    // Get the movie rating from our database
    const movieRating = getMovieRating(movieTitle);

    console.log(`get_movie_rating: ${movieTitle} -> ${movieRating}`);

    // Create a tool call message with the result
    const toolCallReply = {
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(movieRating)
    };

    return toolCallReply;
  }

  console.warning(`Unknown function call: ${call.function.name}`);
  return null;
}

//=======================================================
async function handleToolCall(assistantMessage, messages, userMessage)
{
  const call = assistantMessage.tool_calls[0];

  console.log(`Function/tool call detected for ${call.function.name}`);

  // Resolve the function call
  const toolCallReply = makeToolCallReply(assistantMessage);

  // ...if the function call was resolved, then "secondMessages" will be an array
  if (toolCallReply)
  {
    const messagesWithToolCall = [
      ...messages,
      assistantMessage,
      toolCallReply,
    ];

    // Call the API _again_, but with the function response
    const secondCompletion = await openai.chat.completions.create({
      model: modelName,
      messages: messagesWithToolCall,
      temperature: 0.7
    });

    // Get the new response
    const aiResponse = secondCompletion.choices[0].message.content;

    // Store the full conversation including function calls in history
    conversationHistory.push({role: "user", content: userMessage});
    conversationHistory.push(assistantMessage);
    conversationHistory.push(toolCallReply);
    conversationHistory.push({role: "assistant", content: aiResponse});
    trimConversationHistory(); // Limit history size

    return aiResponse;
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
      const aiResponse = await handleToolCall(assistantMessage, messages, userMessage);
      if (aiResponse)
        return res.json({ response: aiResponse });
    }

    // If no function call, just add to history and return the response
    const aiResponse = assistantMessage.content;
    conversationHistory.push({ role: "user", content: userMessage });
    conversationHistory.push({ role: "assistant", content: aiResponse });
    trimConversationHistory(); // Limit history size

    return res.json({ response: aiResponse });
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
