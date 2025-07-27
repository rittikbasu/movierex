import { useState } from "react";
import { Geist } from "next/font/google";
import Image from "next/image";
import MovieChat from "../components/MovieChat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div
      className={`${geistSans.variable} text-white font-sans overflow-hidden h-dvh`}
    >
      <div className="h-full flex flex-col max-w-lg mx-auto">
        {/* Header */}
        <div className="px-4 md:px-6 pt-4 md:py-6 flex-shrink-0 relative z-30">
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center -ml-2.5">
              <Image
                src="/trex.png"
                alt="movierex logo"
                width={28}
                height={28}
                className="filter brightness-0 invert align-baseline"
              />
              <h1 className="text-xl md:text-2xl font-medium text-[#EFEFEF]">
                movierex
              </h1>
            </div>
            <p className="text-[#6A6A6A] text-sm md:text-base">
              discover your next favorite movie
            </p>
          </div>
        </div>

        {/* Fade overlay for smooth text transition */}
        <div
          className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
          style={{
            height: "130px",
            background:
              "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,0) 100%)",
          }}
        ></div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0">
          <MovieChat />
        </div>
      </div>
    </div>
  );
}
