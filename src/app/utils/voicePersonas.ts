export interface VoicePersona {
  id: string;
  name: string;
  gender: "Female" | "Male";
  description: string;
  pitch: number;
  browserVoiceKeywords: string[];
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: "aria",
    name: "Aria",
    gender: "Female",
    description: "Warm Female",
    pitch: 1.1,
    browserVoiceKeywords: ["Aria", "Samantha", "Google US English", "en-US"],
  },
  {
    id: "sophia",
    name: "Sophia",
    gender: "Female",
    description: "Fluent Female",
    pitch: 1.0,
    browserVoiceKeywords: [
      "Sophia",
      "Victoria",
      "Google UK English Female",
      "en-GB",
    ],
  },
  {
    id: "zira",
    name: "Zira",
    gender: "Female",
    description: "Classic Female",
    pitch: 1.0,
    browserVoiceKeywords: ["Zira", "Karen", "en-US"],
  },
  {
    id: "guy",
    name: "Guy",
    gender: "Male",
    description: "Warm Male",
    pitch: 0.9,
    browserVoiceKeywords: ["Guy", "Daniel", "Google UK English Male", "en-GB"],
  },
  {
    id: "david",
    name: "David",
    gender: "Male",
    description: "Classic Male",
    pitch: 0.8,
    browserVoiceKeywords: ["David", "Alex", "Google US English", "en-US"],
  },
  {
    id: "marcus",
    name: "Marcus",
    gender: "Male",
    description: "Deep Male",
    pitch: 0.7,
    browserVoiceKeywords: ["Marcus", "Fred", "en-US"],
  },
];

export const resolveBrowserVoice = (
  personaId: string,
): SpeechSynthesisVoice | null => {
  const persona =
    VOICE_PERSONAS.find((p) => p.id === personaId) ||
    VOICE_PERSONAS.find((p) => p.id === "david");
  if (!persona) return null;

  const availableVoices = window.speechSynthesis.getVoices();
  if (!availableVoices || availableVoices.length === 0) return null;

  // 1. Exact match (case insensitive) from keywords
  for (const keyword of persona.browserVoiceKeywords) {
    const match = availableVoices.find((v) =>
      v.name.toLowerCase().includes(keyword.toLowerCase()),
    );
    if (match) return match;
  }

  // 2. Same gender fallback (basic heuristic)
  const isMale = persona.gender === "Male";
  const genderMatch = availableVoices.find((v) =>
    isMale
      ? v.name.includes("Male") ||
        v.name.includes("David") ||
        v.name.includes("Guy") ||
        v.name.includes("Alex") ||
        v.name.includes("Daniel")
      : v.name.includes("Female") ||
        v.name.includes("Zira") ||
        v.name.includes("Samantha") ||
        v.name.includes("Aria"),
  );
  if (genderMatch) return genderMatch;

  // 3. Any English voice
  const englishMatch = availableVoices.find((v) => v.lang.startsWith("en"));
  if (englishMatch) return englishMatch;

  // 4. Default browser voice
  return availableVoices[0] || null;
};
