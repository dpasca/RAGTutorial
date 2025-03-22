require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');

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

// Function to execute the movie rating lookup
function getMovieRating(movieTitle) {
  // Try to find an exact match
  if (movieDatabase[movieTitle]) {
    return {
      movieTitle,
      rating: movieDatabase[movieTitle].rating,
      year: movieDatabase[movieTitle].year,
      genres: movieDatabase[movieTitle].genres.join(", ")
    };
  }

  // Try to find a case-insensitive match
  const lowerCaseTitle = movieTitle.toLowerCase();
  for (const title in movieDatabase) {
    if (title.toLowerCase() === lowerCaseTitle) {
      return {
        movieTitle: title,
        rating: movieDatabase[title].rating,
        year: movieDatabase[title].year,
        genres: movieDatabase[title].genres.join(", ")
      };
    }
  }

  // Try to find a partial match
  for (const title in movieDatabase) {
    if (title.toLowerCase().includes(lowerCaseTitle) ||
        lowerCaseTitle.includes(title.toLowerCase())) {
      return {
        movieTitle: title,
        rating: movieDatabase[title].rating,
        year: movieDatabase[title].year,
        genres: movieDatabase[title].genres.join(", "),
        note: `Found "${title}" as a partial match for "${movieTitle}"`
      };
    }
  }

  // No match found
  return {
    movieTitle,
    error: "Movie not found in our database"
  };
}

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call OpenAI API with function calling
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Make sure you're using a model that supports function calling
      messages: [{ role: "user", content: message }],
      max_tokens: 500,
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
          model: "gpt-3.5-turbo",
          messages: [
            { role: "user", content: message },
            responseMessage,
            {
              role: "tool",
              tool_call_id: functionCall.id,
              content: JSON.stringify(movieData)
            }
          ],
          max_tokens: 500,
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log('Make sure you have set your OPENAI_API_KEY in the .env file');
});
