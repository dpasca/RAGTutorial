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
  return process.env.MODEL_NAME || (useOllama ? "qwen2.5:3b" : "gpt-4o-mini");
}

//=======================================================
// Initialize the client
const openai = initializeClient();
const modelName = getModelName();
console.log(`Using model: ${modelName}`);

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
// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call LLM API with function calling
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
      tools: [{ type: "function", function: getMovieRatingFunction }],
      tool_choice: "auto"
    });

    const responseMessage = completion.choices[0].message;

    // Check if the model wants to call a function
    if (responseMessage.tool_calls) {
      const functionCall = responseMessage.tool_calls[0];

      console.log(`Function call detected for ${functionCall.function.name}`);

      if (functionCall.function.name === "get_movie_rating") {
        // Parse the function arguments
        const functionArgs = JSON.parse(functionCall.function.arguments);
        const movieTitle = functionArgs.movieTitle;

        console.log(`Calling get_movie_rating for ${movieTitle}`);

        // Get the movie rating
        const movieRating = getMovieRating(movieTitle);

        console.log(`Obtained movie rating: ${movieRating}`);

        console.log(`Calling the API again with the function response`);

        // Call the API again with the function response
        const secondCompletion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: "user", content: message },
            responseMessage,
            {
              role: "tool",
              tool_call_id: functionCall.id,
              content: JSON.stringify(movieRating)
            }
          ],
          temperature: 0.7
        });

        return res.json({ response: secondCompletion.choices[0].message.content });
      }
    }

    // If no function call, just return the response
    return res.json({ response: responseMessage.content });
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
