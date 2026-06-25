import React from "react";
import IntelligenceBackground from "./IntelligenceBackground";

interface BackgroundProviderProps {
  children: React.ReactNode;
}

export default function BackgroundProvider({
  children,
}: BackgroundProviderProps) {
  return (
    <div className="relative min-h-screen w-full bg-[#030712]">
      {/* Background Layer */}
      <IntelligenceBackground />

      {/* Content Layer */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
