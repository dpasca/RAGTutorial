require('dotenv').config();
const express = require('express');
const path = require('path');
const { OpenAI } = require('openai');

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
  return process.env.MODEL_NAME || (useOllama ? "qwen2.5:7b" : "gpt-4o-mini");
}

//=======================================================
// Initialize the client
const openai = initializeClient();
const modelName = getModelName();
console.log(`Using model: ${modelName}`);

//=======================================================
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

//=======================================================
// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
