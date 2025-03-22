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
  return process.env.MODEL_NAME || (useOllama ? "llama3" : "gpt-4o-mini");
}

//=======================================================
// Initialize the client
const openai = initializeClient();
const modelName = getModelName();
console.log(`Using model: ${modelName}`);

//=======================================================
// Simple movie database
const movieDatabase = {
  "The Shawshank Redemption": { rating: 9.3, year: 1994, genres: ["Drama"] },
  "The Godfather": { rating: 9.2, year: 1972, genres: ["Crime", "Drama"] },
  "The Dark Knight": { rating: 9.0, year: 2008, genres: ["Action", "Crime", "Drama"] },
  "Pulp Fiction": { rating: 8.9, year: 1994, genres: ["Crime", "Drama"] },
  "Fight Club": { rating: 8.8, year: 1999, genres: ["Drama"] },
  "Inception": { rating: 8.8, year: 2010, genres: ["Action", "Adventure", "Sci-Fi"] },
  "The Matrix": { rating: 8.7, year: 1999, genres: ["Action", "Sci-Fi"] },
  "Goodfellas": { rating: 8.7, year: 1990, genres: ["Biography", "Crime", "Drama"] },
  "The Silence of the Lambs": { rating: 8.6, year: 1991, genres: ["Crime", "Drama", "Thriller"] },
  "Interstellar": { rating: 8.6, year: 2014, genres: ["Adventure", "Drama", "Sci-Fi"] },
  "Parasite": { rating: 8.5, year: 2019, genres: ["Drama", "Thriller"] },
  "Joker": { rating: 8.4, year: 2019, genres: ["Crime", "Drama", "Thriller"] },
  "Avatar": { rating: 7.8, year: 2009, genres: ["Action", "Adventure", "Fantasy"] },
  "Titanic": { rating: 7.9, year: 1997, genres: ["Drama", "Romance"] },
  "Star Wars: Episode IV - A New Hope": { rating: 8.6, year: 1977, genres: ["Action", "Adventure", "Fantasy"] },
  "Jurassic Park": { rating: 8.2, year: 1993, genres: ["Action", "Adventure", "Sci-Fi"] },
  "Forrest Gump": { rating: 8.8, year: 1994, genres: ["Drama", "Romance"] },
  "The Lion King": { rating: 8.5, year: 1994, genres: ["Animation", "Adventure", "Drama"] },
  "The Avengers": { rating: 8.0, year: 2012, genres: ["Action", "Adventure", "Sci-Fi"] },
  "Toy Story": { rating: 8.3, year: 1995, genres: ["Animation", "Adventure", "Comedy"] }
};

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

      if (functionCall.function.name === "get_movie_rating") {
        // Parse the function arguments
        const functionArgs = JSON.parse(functionCall.function.arguments);
        const movieTitle = functionArgs.movieTitle;

        // Get the movie rating
        const movieData = getMovieRating(movieTitle);

        // Call the API again with the function response
        const secondCompletion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: "user", content: message },
            responseMessage,
            {
              role: "tool",
              tool_call_id: functionCall.id,
              content: JSON.stringify(movieData)
            }
          ],
          temperature: 0.7
        });

        return res.json({
          response: secondCompletion.choices[0].message.content,
          functionCall: {
            name: "get_movie_rating",
            arguments: functionArgs,
            result: movieData
          }
        });
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
