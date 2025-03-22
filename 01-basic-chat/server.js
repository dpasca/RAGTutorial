require('dotenv').config();
const express = require('express');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize Express app
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize LLM client based on environment variables
function initializeClient() {
  // Check if using Ollama or OpenAI
  const useOllama = process.env.USE_OLLAMA !== "false"; // Default to true

  if (useOllama) {
    // Use OpenAI client with Ollama's OpenAI-compatible endpoint
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const apiBase = `${ollamaBaseUrl}/v1`;

    console.log(`Using Ollama's OpenAI-compatible API at: ${apiBase}`);

    return new OpenAI({
      baseURL: apiBase,
      apiKey: "ollama", // Any non-empty string works as Ollama doesn't check the API key
    });
  } else {
    // Standard OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.warn("Warning: OPENAI_API_KEY not found but USE_OLLAMA=false. Check your .env file.");
    }

    console.log("Using OpenAI API");

    return new OpenAI({
      apiKey: apiKey,
    });
  }
}

// Get model name from environment or use appropriate default
function getModelName() {
  const useOllama = process.env.USE_OLLAMA !== "false";
  return process.env.MODEL_NAME || (useOllama ? "llama3" : "gpt-4o-mini");
}

// Initialize the client
const openai = initializeClient();
const modelName = getModelName();
console.log(`Using model: ${modelName}`);

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call LLM API
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: message }],
      max_tokens: 500,
      temperature: 0.7,
    });

    // Extract and send the response
    const aiResponse = completion.choices[0].message.content;
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      error: 'An error occurred',
      details: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);

  // Print appropriate configuration message
  const useOllama = process.env.USE_OLLAMA !== "false";
  if (useOllama) {
    console.log('Using Ollama. Make sure Ollama is running on your machine.');
  } else {
    console.log('Using OpenAI. Make sure you have set your OPENAI_API_KEY in the .env file.');
  }
});
