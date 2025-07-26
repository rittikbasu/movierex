import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import Image from "next/image";

const MovieChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "what movies have you recently watched that you liked?",
      timestamp: Date.now(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState("");
  const [movieSuggestions, setMovieSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState("movie_input"); // movie_input, movie_feedback, choice_buttons
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieCount, setMovieCount] = useState(0);
  const [userPreferences, setUserPreferences] = useState([]);
  const [maxMovies, setMaxMovies] = useState(3); // Can be 3 or 5

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const searchMovies = useCallback(async (query) => {
    if (query.length < 2) {
      setMovieSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(
        `/api/search-movies?query=${encodeURIComponent(query)}`
      );
      // Sort by popularity (higher popularity first) and take top 5
      const sortedResults =
        response.data.results
          ?.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
          ?.slice(0, 5) || [];
      setMovieSuggestions(sortedResults);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error searching movies:", error);
      setMovieSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    (query) => {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout
      searchTimeoutRef.current = setTimeout(() => {
        searchMovies(query);
      }, 200); // 300ms delay
    },
    [searchMovies]
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCurrentInput(value);

    if (currentStep === "movie_input") {
      debouncedSearch(value);
    }
  };

  const selectMovie = async (movie) => {
    setSelectedMovie(movie);
    setCurrentInput("");
    setShowSuggestions(false);
    setIsLoading(true);

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: "user",
      text: movie.title,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Get GPT response about the movie
      const response = await axios.post("/api/movie-comment", {
        movieTitle: movie.title,
        movieYear: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
        type: "movie_selected",
      });

      const botResponse = {
        id: Date.now() + 1,
        type: "bot",
        text: response.data.message,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botResponse]);

      // After a short delay, ask the follow-up question
      setTimeout(() => {
        const followUpMessage = {
          id: Date.now() + 2,
          type: "bot",
          text: "what did you like about this movie?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, followUpMessage]);
        setCurrentStep("movie_feedback");
      }, 1500);
    } catch (error) {
      console.error("Error getting movie comment:", error);
      const errorMessage = {
        id: Date.now() + 1,
        type: "bot",
        text: "great choice! what did you like about this movie?",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setCurrentStep("movie_feedback");
    }

    setIsLoading(false);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!currentInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: currentInput,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Store user preference
    const newPreference = {
      movie: selectedMovie,
      feedback: currentInput.trim(),
    };
    setUserPreferences((prev) => [...prev, newPreference]);
    setMovieCount((prev) => prev + 1);

    setIsLoading(true);

    try {
      // Get GPT response to user's feedback
      const response = await axios.post("/api/movie-comment", {
        movieTitle: selectedMovie.title,
        userFeedback: currentInput.trim(),
        type: "feedback_response",
      });

      const botResponse = {
        id: Date.now() + 1,
        type: "bot",
        text: response.data.message,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botResponse]);

      // Check if we've collected enough movies
      if (movieCount + 1 >= maxMovies) {
        if (maxMovies === 5) {
          // After 5 movies, automatically show recommendations
          setTimeout(() => {
            console.log("Final user preferences:", [
              ...userPreferences,
              newPreference,
            ]);
            const finalMessage = {
              id: Date.now() + 2,
              type: "bot",
              text: "perfect! let me analyze your taste and find some amazing recommendations...",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, finalMessage]);
          }, 1500);
        } else {
          // After 3 movies, show choice buttons
          setTimeout(() => {
            const choiceMessage = {
              id: Date.now() + 2,
              type: "bot",
              text: "cool! want to add a few more movies or should i give you some recommendations?",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, choiceMessage]);
            setCurrentStep("choice_buttons");
          }, 1500);
        }
      } else {
        setTimeout(() => {
          const nextMovieMessage = {
            id: Date.now() + 2,
            type: "bot",
            text: "nice! what's another movie you've enjoyed recently?",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, nextMovieMessage]);
          setCurrentStep("movie_input");
        }, 1500);
      }
    } catch (error) {
      console.error("Error getting feedback response:", error);
      // Fallback response
      if (movieCount + 1 >= maxMovies) {
        if (maxMovies === 5) {
          setTimeout(() => {
            console.log("Final user preferences:", [
              ...userPreferences,
              newPreference,
            ]);
            const finalMessage = {
              id: Date.now() + 1,
              type: "bot",
              text: "perfect! let me analyze your taste and find some amazing recommendations...",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, finalMessage]);
          }, 1000);
        } else {
          setTimeout(() => {
            const choiceMessage = {
              id: Date.now() + 1,
              type: "bot",
              text: "cool! want to add a few more movies or should i give you some recommendations?",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, choiceMessage]);
            setCurrentStep("choice_buttons");
          }, 1000);
        }
      } else {
        setTimeout(() => {
          const nextMovieMessage = {
            id: Date.now() + 1,
            type: "bot",
            text: "nice! what's another movie you've enjoyed recently?",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, nextMovieMessage]);
          setCurrentStep("movie_input");
        }, 1000);
      }
    }

    setCurrentInput("");
    setSelectedMovie(null);
    setIsLoading(false);
  };

  const handleChoice = (choice) => {
    if (choice === "recommendations") {
      console.log("User preferences:", userPreferences);
      const responseMessage = {
        id: Date.now(),
        type: "bot",
        text: "awesome! let me think about some perfect recommendations for you...",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, responseMessage]);
    } else {
      setMaxMovies(5); // Allow up to 5 movies total
      const moreMoviesMessage = {
        id: Date.now(),
        type: "bot",
        text: "great! let's add a couple more. what's another movie you loved?",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, moreMoviesMessage]);
      setCurrentStep("movie_input");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentStep === "movie_feedback") {
      handleFeedbackSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4 pt-14 md:py-6 space-y-4 md:space-y-6">
        {messages.map((message, index) => (
          <div key={message.id} className="space-y-2">
            <div className="text-[#6A6A6A] text-sm font-medium">
              {message.type === "bot" ? "rex" : "you"}
            </div>
            <div
              className={`${
                message.type === "user" ? "text-[#EFEFEF]" : "text-gray-300"
              } text-base md:text-lg leading-relaxed`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="space-y-2">
            <div className="text-[#6A6A6A] text-sm font-medium">rex</div>
            <div className="text-gray-300 text-base md:text-lg leading-relaxed">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-0.5">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 px-4 md:px-6 pb-4 pt-2 md:pb-6 relative">
        {/* Choice Buttons */}
        {currentStep === "choice_buttons" && (
          <div className="flex space-x-3">
            <button
              onClick={() => handleChoice("more")}
              className="flex-1 border border-[#1A1A1A] rounded-lg px-4 py-3 bg-black text-[#6A6A6A] hover:text-[#EFEFEF] hover:border-[#6A6A6A] transition-colors text-sm"
            >
              add movies
            </button>
            <button
              onClick={() => handleChoice("recommendations")}
              className="flex-1 border border-[#1A1A1A] rounded-lg px-4 py-3 bg-black text-[#6A6A6A] hover:text-[#EFEFEF] hover:border-[#6A6A6A] transition-colors text-sm"
            >
              get recs
            </button>
          </div>
        )}

        {/* Movie Suggestions */}
        {showSuggestions && currentStep === "movie_input" && (
          <div
            className="absolute bottom-full left-4 right-4 md:left-6 md:right-6 mb-2"
            ref={suggestionsRef}
          >
            <div className="bg-black border border-[#1A1A1A] rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
              {movieSuggestions.length > 0 ? (
                <>
                  {movieSuggestions.map((movie, index) => (
                    <button
                      key={movie.id}
                      onClick={() => selectMovie(movie)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-900 transition-colors ${
                        index < movieSuggestions.length - 1
                          ? "border-b border-[#1A1A1A]"
                          : ""
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-12 bg-black border border-[#1A1A1A] rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {movie.poster_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt={movie.title}
                              width={32}
                              height={48}
                              className="object-cover"
                            />
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-4 h-4 text-[#6A6A6A]"
                            >
                              <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                              />
                              <path d="M3 9l6 6 4-4 8 8" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-300 text-sm font-medium">
                            {movie.title}
                          </p>
                          {movie.release_date && (
                            <p className="text-[#6A6A6A] text-xs">
                              {new Date(movie.release_date).getFullYear()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-4 py-3 text-center text-[#6A6A6A] text-sm">
                  no movies found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Form */}
        {currentStep !== "choice_buttons" && (
          <form onSubmit={handleSubmit}>
            <div className="border border-[#1A1A1A] rounded-lg px-4 py-3 bg-black flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={handleInputChange}
                placeholder="message rex..."
                className="flex-1 bg-transparent border-none outline-none text-[#EFEFEF] placeholder-[#6A6A6A] text-base md:text-lg"
                disabled={isLoading}
              />
              {currentStep === "movie_feedback" && currentInput.trim() && (
                <button
                  type="submit"
                  className="text-[#6A6A6A] hover:text-[#EFEFEF] transition-colors text-lg ml-3 flex items-center"
                  disabled={isLoading}
                  aria-label="send"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MovieChat;
