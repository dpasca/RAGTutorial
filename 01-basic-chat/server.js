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
