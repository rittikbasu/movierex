# movierex

A movie recommendation web app with a chat-like onboarding interface built with Next.js, OpenAI's GPT API, and The Movie Database (TMDB) API.

## Features

- 🎬 Chat-like onboarding interface inspired by Buildspace's Sage
- 🔍 Real-time movie search with TMDB API autocomplete
- 🤖 AI-powered movie commentary using OpenAI's GPT
- 🌙 Clean, minimal dark theme with Tailwind CSS
- 📱 Responsive design

## Setup

1. **Clone and install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   Create a `.env.local` file in the root directory:

   ```env
   # TMDB API Key
   # Get your free API key at: https://www.themoviedb.org/settings/api
   TMDB_API_KEY=your_tmdb_api_key_here

   # OpenAI API Key
   # Get your API key at: https://platform.openai.com/api-keys
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Get your API keys:**

   - **TMDB API:** Sign up at [TMDB](https://www.themoviedb.org/settings/api) and get your free API key
   - **OpenAI API:** Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

4. **Run the development server:**

   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How it works

1. Users are greeted with a chat interface asking: "what movies have you recently watched that you liked?"
2. As they type, the app fetches autocomplete suggestions from TMDB
3. After selecting a movie, GPT provides a friendly comment about their choice
4. The app then asks: "what did you like about this movie?"
5. Users can continue adding more movies in this conversational flow

## Tech Stack

- **Framework:** Next.js 15 with Pages Router
- **Styling:** Tailwind CSS v4
- **Fonts:** Geist Sans
- **APIs:**
  - TMDB API for movie data
  - OpenAI GPT-3.5-turbo for movie commentary
- **HTTP Client:** Axios

## Project Structure

```
src/
├── components/
│   └── MovieChat.js          # Main chat interface component
├── pages/
│   ├── api/
│   │   ├── search-movies.js  # TMDB movie search endpoint
│   │   └── movie-comment.js  # OpenAI movie commentary endpoint
│   ├── index.js              # Homepage with chat interface
│   └── ...
└── styles/
    └── globals.css           # Global styles with Tailwind
```

## Next Steps

This is the initial UI/UX implementation. Future features will include:

- Complete onboarding flow for 3-5 movies
- Movie recommendation algorithm
- User preference analysis
- Recommendation results page
