import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ message: "Query parameter is required" });
  }

  // Validate query length and content
  if (query.length < 2) {
    return res
      .status(400)
      .json({ message: "Query must be at least 2 characters" });
  }

  if (query.length > 100) {
    return res.status(400).json({ message: "Query too long" });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ message: "TMDB API key not configured" });
  }

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie`,
      {
        params: {
          api_key: process.env.TMDB_API_KEY,
          query: query.trim(),
          language: "en-US",
          page: 1,
          include_adult: false,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Return only necessary data to reduce payload
    const filteredResults =
      response.data.results?.map((movie) => ({
        id: movie.id,
        title: movie.title,
        release_date: movie.release_date,
        poster_path: movie.poster_path,
        popularity: movie.popularity,
        overview: movie.overview,
      })) || [];

    res.status(200).json({ results: filteredResults });
  } catch (error) {
    console.error("TMDB API error:", error);

    if (error.code === "ECONNABORTED") {
      return res.status(408).json({ message: "Request timeout" });
    }

    if (error.response?.status === 429) {
      return res
        .status(429)
        .json({ message: "Too many requests, please try again later" });
    }

    res.status(500).json({
      message: "Error searching movies",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
}
