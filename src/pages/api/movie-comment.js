import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { movieTitle, movieYear, userFeedback, type } = req.body;

  if (!movieTitle) {
    return res.status(400).json({ message: "Movie title is required" });
  }

  // Validate input
  if (typeof movieTitle !== "string" || movieTitle.trim().length === 0) {
    return res.status(400).json({ message: "Valid movie title is required" });
  }

  if (movieTitle.length > 200) {
    return res.status(400).json({ message: "Movie title too long" });
  }

  if (
    movieYear &&
    (typeof movieYear !== "number" ||
      movieYear < 1800 ||
      movieYear > new Date().getFullYear() + 5)
  ) {
    return res.status(400).json({ message: "Invalid movie year" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: "OpenAI API key not configured" });
  }

  try {
    const movieInfo = movieYear
      ? `${movieTitle.trim()} (${movieYear})`
      : movieTitle.trim();
    // Default negative and invalid flags
    let isNegative = false;
    let needsClarification = false;
    // If user feedback, detect negative or invalid sentiment first and exit early to save tokens
    if (type === "feedback_response" && userFeedback) {
      try {
        const sentimentCheck = await openai.chat.completions.create({
          model: "gpt-4.1-nano",
          messages: [
            {
              role: "system",
              content:
                "You are analyzing user feedback about a movie they supposedly liked. Respond with only ONE of the following: 'YES' if the feedback indicates the user disliked the movie or selected it by mistake, 'INVALID' if the feedback is gibberish or doesn't make sense as a description of what they liked, or 'NO' if the feedback is valid (positive or neutral). Examples: 'it was boring' = YES, 'I hate it' = YES, 'wrong movie' = YES, 'haven't seen it' = YES, 'asdf' = INVALID, 'ciufivu' = INVALID, 'great acting' = NO.",
            },
            {
              role: "user",
              content: `User feedback about ${movieInfo}: "${userFeedback}"`,
            },
          ],
          max_tokens: 5,
          temperature: 0.1,
        });
        const sentiment = sentimentCheck.choices[0]?.message?.content
          ?.trim()
          .toUpperCase();
        isNegative = sentiment === "YES";
        needsClarification = sentiment === "INVALID";
      } catch (error) {
        console.error("Error checking sentiment:", error);
      }
      // If invalid feedback, ask for clarification
      if (needsClarification) {
        return res
          .status(200)
          .json({ message: "", isNegative: false, needsClarification: true });
      }
      // If feedback is negative, skip GPT comment and prompt removal
      if (isNegative) {
        return res
          .status(200)
          .json({ message: "", isNegative: true, needsClarification: false });
      }
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "feedback_response") {
      // Response to user's feedback about what they liked about the movie
      systemPrompt =
        "You are Rex, a casual movie enthusiast. The user just shared what they liked about a movie. Respond with a very brief, casual reaction to their specific feedback. Keep it to 1 short sentence. Use lowercase, be conversational and natural like you're chatting with a friend. Show you understand their taste. No questions.";
      userPrompt = `The user said this about ${movieInfo}: "${userFeedback}"`;
    } else {
      // Default movie selection response
      systemPrompt =
        "You are Rex, a casual movie enthusiast. The user just mentioned a movie they liked. Respond with a brief, casual, and positive comment about the movie. Keep it to 1-2 short sentences. Use lowercase and be conversational, like you're chatting with a friend. Focus on what makes the movie great or interesting.";
      userPrompt = `The user just mentioned they liked the movie: ${movieInfo}`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 80,
      temperature: 0.7,
    });

    const message =
      completion.choices[0]?.message?.content?.trim() ||
      (type === "feedback_response"
        ? "totally get that!"
        : "great choice! that's a fantastic movie.");
    // Return comment for positive feedback or selection, include flags
    res.status(200).json({ message, isNegative, needsClarification: false });
  } catch (error) {
    console.error("OpenAI API error:", error);

    if (error.code === "insufficient_quota") {
      return res.status(402).json({ message: "API quota exceeded" });
    }

    if (error.code === "rate_limit_exceeded") {
      return res
        .status(429)
        .json({ message: "Rate limit exceeded, please try again later" });
    }

    if (error.name === "AbortError" || error.code === "ECONNABORTED") {
      return res.status(408).json({ message: "Request timeout" });
    }

    res.status(500).json({
      message: "Error generating movie comment",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
}
