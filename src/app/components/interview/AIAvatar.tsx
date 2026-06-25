import { motion } from "motion/react";

export default function AIAvatar({
  state = "listening",
}: {
  state?: "listening" | "thinking" | "speaking";
}) {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Outer Rings */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.2, 1] : isListening ? [1, 1.05, 1] : 1,
          opacity: isThinking ? 0.3 : 0.8,
        }}
        transition={{
          duration: isSpeaking ? 1.5 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute inset-0 rounded-full border-2 ${isThinking ? "border-violet-500/30" : "border-teal-500/30"}`}
      />

      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.4, 1] : isListening ? [1, 1.1, 1] : 1,
          rotate: isThinking ? 180 : 0,
        }}
        transition={{
          duration: isSpeaking ? 1.5 : isThinking ? 4 : 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
        className={`absolute inset-4 rounded-full border border-dashed ${isThinking ? "border-violet-400/40" : "border-cyan-400/40"}`}
      />

      {/* Core */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.1, 1] : 1,
          borderRadius: isThinking ? ["50%", "40%", "50%"] : "50%",
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
          isThinking
            ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/50"
            : "bg-gradient-to-br from-teal-400 to-cyan-500 shadow-teal-500/50"
        }`}
      >
        {/* Inner energy core */}
        <motion.div
          animate={{ scale: [1, 0.8, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: isSpeaking ? 0.5 : 2, repeat: Infinity }}
          className="w-12 h-12 bg-white rounded-full blur-sm"
        />
      </motion.div>

      {/* Particles */}
      {isThinking &&
        [...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -40],
              x: [0, (i - 1) * 20],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
            }}
            className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-violet-400 blur-[1px]"
          />
        ))}
    </div>
  );
}
