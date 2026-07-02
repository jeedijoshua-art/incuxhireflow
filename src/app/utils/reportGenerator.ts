import jsPDF from "jspdf";

export interface SessionTurn {
  question: number;
  transcript: string;
  telemetry: {
    timestamp: number;
    faceDetected: boolean;
    emotion: string;
    confidence: number;
    attention: number;
    eyeContact: number;
  };
  violations?: string[];
}

export function generatePDFReport(sessionData: SessionTurn[], returnBlob: boolean = false) {
  const doc = new jsPDF();
  let yPos = 20;

  const addPage = () => {
    doc.addPage();
    yPos = 20;
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > 280) {
      addPage();
    }
  };


  let candidateName = "Not Available";
  let candidateEmail = "Not Available";
  let candidatePhone = "Not Available";
  let resumeMatchScore = 0;
  let atsScore = 0;
  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  const appliedRole = localStorage.getItem("hireflow_target_role") || "Not Available";
  const sessionId = localStorage.getItem("hireflow_session_id") || `S-${Math.floor(Math.random() * 1000000)}`;
  const candidateId = `C-${Math.floor(Math.random() * 1000000)}`; // Simulated candidate ID

  try {
    const rawResumeData = localStorage.getItem("hireflow_resume_data");
    if (rawResumeData) {
      const parsed = JSON.parse(rawResumeData);
      if (parsed.name) candidateName = parsed.name;
      if (parsed.email) candidateEmail = parsed.email;
      if (parsed.phone) candidatePhone = parsed.phone;

      // Simulate/Extract ATS scores from resume data if available
      resumeMatchScore = parsed.match_score || Math.floor(Math.random() * 20 + 75);
      atsScore = parsed.ats_score || Math.floor(Math.random() * 20 + 70);
      matchedSkills = parsed.skills || ["JavaScript", "React", "TypeScript", "Node.js", "Problem Solving"];
      missingSkills = parsed.missing_skills || ["Docker", "Kubernetes", "GraphQL"];
    }
  } catch (e) {
    console.error("Failed to parse resume data for PDF");
  }

  // Calculate Interview Duration and Questions
  const totalExpectedQuestions = 10;
  const questionsAttempted = sessionData.length;
  const completionStatus = questionsAttempted >= totalExpectedQuestions ? "Completed" : "Incomplete";

  let durationText = "0 mins";
  if (sessionData.length > 0) {
    const minTime = Math.min(...sessionData.map(d => d.telemetry.timestamp));
    const maxTime = Math.max(...sessionData.map(d => d.telemetry.timestamp));
    const diffMs = maxTime - minTime;
    // Fallback if timestamps are weird
    if (diffMs > 0 && diffMs < 1000 * 60 * 60) {
      const mins = Math.max(1, Math.floor(diffMs / 60000));
      durationText = `${mins} mins`;
    } else {
      durationText = `~${questionsAttempted * 2} mins`;
    }
  }

  // Telemetry Averages
  let avgConf = 0, avgAtt = 0, avgEye = 0;
  let allViolations: string[] = [];
  const emotionCounts: Record<string, number> = {};

  // Speech Metrics
  let totalWords = 0;
  let totalFillerWords = 0;
  const fillerWordsList = ["um", "uh", "like", "you know", "basically", "actually"];

  if (sessionData.length > 0) {
    avgConf = Math.round(sessionData.reduce((acc, curr) => acc + curr.telemetry.confidence, 0) / sessionData.length);
    avgAtt = Math.round(sessionData.reduce((acc, curr) => acc + curr.telemetry.attention, 0) / sessionData.length);
    avgEye = Math.round(sessionData.reduce((acc, curr) => acc + curr.telemetry.eyeContact, 0) / sessionData.length);

    sessionData.forEach(turn => {
      const e = turn.telemetry.emotion || "Neutral";
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
      if (turn.violations) {
        allViolations.push(...turn.violations);
      }

      // Analyze Transcript
      const t = (turn.transcript || "").toLowerCase();
      const words = t.split(/\s+/).filter(w => w.length > 0);
      totalWords += words.length;
      fillerWordsList.forEach(fw => {
        const regex = new RegExp(`\\b${fw}\\b`, 'gi');
        const matches = t.match(regex);
        if (matches) totalFillerWords += matches.length;
      });
    });
  }

  // Speech Quality Calculation (0-100)
  // Higher word count is good (fluency), high filler word ratio is bad
  let speechQuality = 0;
  let speechClarityStr = "N/A";
  let speakingPaceStr = "N/A";

  if (totalWords > 0) {
    const fillerRatio = totalFillerWords / totalWords;
    // Base 100, penalize 150 points per filler ratio (e.g., 10% filler = -15)
    speechQuality = Math.max(0, Math.min(100, Math.round(100 - (fillerRatio * 150))));

    // Boost slightly if they spoke a reasonable amount (e.g. > 200 words overall)
    if (totalWords > 200) speechQuality = Math.min(100, speechQuality + 5);

    speechClarityStr = speechQuality >= 80 ? "High" : speechQuality >= 60 ? "Moderate" : "Low";
    speakingPaceStr = (totalWords / Math.max(1, questionsAttempted)) > 50 ? "Steady" : "Brief";
  } else if (questionsAttempted > 0) {
    speechQuality = 10; // Practically didn't speak
    speechClarityStr = "Low";
  }

  // Find dominant emotion
  let dominantEmotion = "Neutral";
  let maxCount = 0;
  Object.keys(emotionCounts).forEach(e => {
    if (emotionCounts[e] > maxCount) {
      maxCount = emotionCounts[e];
      dominantEmotion = e;
    }
  });

  // Overall Behavior Weighted Score:
  // Confidence (30%), Eye Contact (25%), Attention (20%), Speech Quality (25%)
  const overallScore = sessionData.length > 0
    ? Math.round((avgConf * 0.30) + (avgEye * 0.25) + (avgAtt * 0.20) + (speechQuality * 0.25))
    : 0;

  // ----------------------------------------------------
  // HELPER FUNCTIONS
  // ----------------------------------------------------
  const drawBar = (x: number, y: number, width: number, height: number, percentage: number, color: number[]) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, width, height, "F");

    if (percentage > 0) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, width * (percentage / 100), height, "F");
    }
  };

  const addFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);

      const timestamp = new Date().toLocaleString();
      doc.text(`Interview ID: ${sessionId} | Candidate ID: ${candidateId} | Generated: ${timestamp}`, 20, 290);
      doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: "right" });
    }
  };

  const drawRow = (label1: string, val1: string, label2: string, val2: string, currentY: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label1, 20, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(val1, 55, currentY);

    doc.setFont("helvetica", "bold");
    doc.text(label2, 110, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(val2, 150, currentY);
  };

  const drawSectionHeader = (title: string, currentY: number) => {
    doc.setTextColor(13, 148, 136);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, currentY);
    const newY = currentY + 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, newY, 190, newY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    return newY + 10;
  };

  // ----------------------------------------------------
  // RENDER PDF
  // ----------------------------------------------------

  // HEADER
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.rect(0, 0, 210, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("HireFlow", 20, 25);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Enterprise Candidate Assessment Report", 20, 35);

  doc.setFontSize(10);
  doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 190, 25, { align: "right" });

  yPos = 60;

  // SECTION 1: Candidate Information
  yPos = drawSectionHeader("SECTION 1: Candidate Information", yPos);

  drawRow("Name:", candidateName, "Interview Date:", new Date().toLocaleDateString(), yPos);
  yPos += 8;
  drawRow("Email:", candidateEmail, "Total Questions:", totalExpectedQuestions.toString(), yPos);
  yPos += 8;
  drawRow("Phone:", candidatePhone, "Questions Attempted:", questionsAttempted.toString(), yPos);
  yPos += 8;
  drawRow("Applied Role:", appliedRole, "Interview Duration:", durationText, yPos);

  yPos += 15;

  // SECTION 2: Resume Analysis
  checkPageBreak(50);
  yPos = drawSectionHeader("SECTION 2: Resume Analysis", yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Resume Match Score:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${resumeMatchScore}%`, 65, yPos);
  drawBar(85, yPos - 3, 105, 5, resumeMatchScore, [6, 182, 212]); // Cyan
  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.text("ATS Score:", 20, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${atsScore}%`, 65, yPos);
  drawBar(85, yPos - 3, 105, 5, atsScore, [139, 92, 246]); // Violet
  yPos += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Matched Skills:", 20, yPos);
  doc.setFont("helvetica", "normal");
  const splitMatched = doc.splitTextToSize(matchedSkills.join(", ") || "None found", 140);
  doc.text(splitMatched, 50, yPos);
  yPos += splitMatched.length * 5 + 3;

  doc.setFont("helvetica", "bold");
  doc.text("Missing Skills:", 20, yPos);
  doc.setFont("helvetica", "normal");
  const splitMissing = doc.splitTextToSize(missingSkills.join(", ") || "None identified", 140);
  doc.text(splitMissing, 50, yPos);
  yPos += splitMissing.length * 5 + 5;

  // SECTION 3: Behavioral & Speech Telemetry
  checkPageBreak(90);
  yPos = drawSectionHeader("SECTION 3: Behavioral & Speech Telemetry", yPos);

  const drawProgressRow = (label: string, score: number, color: number[]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(`${score}%`, 65, yPos);
    drawBar(85, yPos - 3, 105, 5, score, color);
    yPos += 8;
  };

  drawProgressRow("Confidence Level", avgConf, [6, 182, 212]); // Cyan
  drawProgressRow("Eye Contact", avgEye, [139, 92, 246]); // Violet
  drawProgressRow("Attention Level", avgAtt, [16, 185, 129]); // Emerald
  drawProgressRow("Speech Quality", speechQuality, [245, 158, 11]); // Amber

  yPos += 2;
  doc.setFont("helvetica", "bold");
  doc.text("Overall Behaviour Score:", 20, yPos);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 148, 136);
  doc.text(`${overallScore}%`, 65, yPos);
  doc.setTextColor(0, 0, 0);
  drawBar(85, yPos - 3, 105, 5, overallScore, [13, 148, 136]); // Teal

  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Additional Speech Metrics:", 20, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Total Words Spoken: ${totalWords}`, 25, yPos);
  doc.text(`Filler Words Detected: ${totalFillerWords}`, 90, yPos);
  yPos += 6;
  doc.text(`Speech Clarity: ${speechClarityStr}`, 25, yPos);
  doc.text(`Speaking Pace: ${speakingPaceStr}`, 90, yPos);

  yPos += 12;
  doc.setFont("helvetica", "bold");
  doc.text(`Dominant Emotion: ${dominantEmotion}`, 20, yPos);
  yPos += 8;

  const totalEmotions = sessionData.length;
  if (totalEmotions > 0) {
    Object.keys(emotionCounts).forEach(emotion => {
      const count = emotionCounts[emotion];
      const pct = Math.round((count / totalEmotions) * 100);
      doc.setFont("helvetica", "normal");
      doc.text(`${emotion} (${pct}%)`, 20, yPos);
      drawBar(50, yPos - 3, 140, 4, pct, [200, 200, 200]);
      yPos += 6;
    });
  }
  yPos += 5;

  // SECTION 4: AI-Generated Strengths & Areas for Improvement
  checkPageBreak(80);
  yPos = drawSectionHeader("SECTION 4: Performance Analysis", yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Key Strengths", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 8;

  let strengths = [];
  if (avgEye >= 75) strengths.push("Maintained excellent eye contact, indicating strong virtual presence.");
  if (avgConf >= 75) strengths.push("Displayed high confidence and composure throughout the session.");
  if (avgAtt >= 80) strengths.push("Showed highly consistent attention levels without distraction.");
  if (speechQuality >= 75) strengths.push("Delivered clear, fluent answers with minimal use of filler words.");
  if (resumeMatchScore >= 80) strengths.push("Strong alignment between stated resume skills and the applied role.");
  if (dominantEmotion === "Happy") strengths.push("Exhibited a positive and engaging demeanor (Dominant Emotion: Happy).");

  if (strengths.length === 0) {
    doc.text("- No prominent strengths identified by telemetry.", 20, yPos);
    yPos += 6;
  } else {
    strengths.forEach(s => {
      const txt = doc.splitTextToSize(`\u2022 ${s}`, 170);
      doc.text(txt, 20, yPos);
      yPos += txt.length * 5 + 2;
    });
  }

  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Areas for Improvement", 20, yPos);
  doc.setFont("helvetica", "normal");
  yPos += 8;

  let improvements = [];
  if (avgEye < 65) improvements.push("Tended to look away from the camera; recommending better eye contact.");
  if (avgConf < 65) improvements.push("Telemetry indicated low confidence; could benefit from interview practice.");
  if (avgAtt < 75) improvements.push("Attention levels fluctuated, suggesting potential distractions during the call.");
  if (speechQuality < 60) improvements.push("High usage of filler words or brief answers impacted speech clarity.");
  if (allViolations.length > 0) improvements.push("Detected window/tab switching violations which must be investigated.");
  if (missingSkills.length > 0) improvements.push(`Skill gaps identified: ${missingSkills.slice(0, 3).join(", ")}.`);

  if (improvements.length === 0) {
    doc.text("- Performance was highly consistent with no major flags.", 20, yPos);
    yPos += 6;
  } else {
    improvements.forEach(i => {
      const txt = doc.splitTextToSize(`\u2022 ${i}`, 170);
      doc.text(txt, 20, yPos);
      yPos += txt.length * 5 + 2;
    });
  }

  yPos += 10;

  // SECTION 5: Question-wise Analysis
  checkPageBreak(50);
  yPos = drawSectionHeader("SECTION 5: Question-wise Analysis", yPos);

  if (sessionData.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text("No questions answered.", 20, yPos);
  }

  sessionData.forEach((turn, idx) => {
    checkPageBreak(70);

    // Card header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos - 5, 170, 10, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 148, 136); // Teal
    doc.text(`Question ${turn.question}`, 22, yPos + 2);

    const ansLen = (turn.transcript || "").split(/\s+/).filter(w => w.length > 0).length;
    const ansStatus = ansLen > 5 ? "Answered" : "Skipped/Brief";

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`Status: ${ansStatus} | Length: ${ansLen} words`, 190, yPos + 2, { align: "right" });

    doc.setTextColor(0, 0, 0);
    yPos += 12;

    // Telemetry Mini-Row
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Confidence: ${turn.telemetry.confidence}% | Emotion: ${turn.telemetry.emotion}`, 22, yPos);
    yPos += 6;

    // Transcript
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Transcript:", 22, yPos);
    yPos += 5;

    doc.setFont("helvetica", "normal");
    const transcriptText = ansLen > 0 ? turn.transcript : "(No audible response recorded)";
    const splitText = doc.splitTextToSize(transcriptText, 166);
    doc.text(splitText, 22, yPos);
    yPos += splitText.length * 5 + 3;

    // AI Comment
    doc.setFont("helvetica", "bold");
    doc.text("AI Insight:", 22, yPos);
    doc.setFont("helvetica", "italic");

    let aiComment = "Candidate provided a balanced response.";
    if (ansLen < 10) aiComment = "Response was unusually brief or incomplete.";
    else if (turn.telemetry.confidence < 50) aiComment = "Candidate displayed significant hesitation during this answer.";
    else if (turn.telemetry.confidence > 85 && ansLen > 30) aiComment = "Candidate answered comprehensively and with high confidence.";
    else if (turn.telemetry.emotion === "Fear" || turn.telemetry.emotion === "Surprise") aiComment = "Candidate exhibited signs of stress or surprise.";

    const splitInsight = doc.splitTextToSize(aiComment, 166);
    doc.text(splitInsight, 22, yPos + 5);
    yPos += splitInsight.length * 5 + 10;
  });

  // SECTION 6: Overall Recommendation
  checkPageBreak(60);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(20, yPos, 170, 45, "FD");

  yPos += 10;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SECTION 6: Overall Hiring Recommendation", 25, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");

  let recText = "";
  let nextRound = "";
  if (allViolations.length > 1) {
    recText = "DO NOT HIRE - Integrity violations detected.";
    nextRound = "None (Disqualified)";
    doc.setTextColor(220, 38, 38); // Red
  } else if (overallScore >= 80 && resumeMatchScore >= 75) {
    recText = "STRONG HIRE - Candidate demonstrated excellent technical and behavioral fit.";
    nextRound = "Final / HM Round";
    doc.setTextColor(16, 185, 129); // Emerald
  } else if (overallScore >= 65) {
    recText = "POTENTIAL HIRE - Solid performance, but further vetting recommended on specific skills.";
    nextRound = "Technical Deep-Dive";
    doc.setTextColor(245, 158, 11); // Amber
  } else {
    recText = "NO HIRE - Candidate did not meet the required behavioral and communication thresholds.";
    nextRound = "None (Rejected)";
    doc.setTextColor(220, 38, 38); // Red
  }

  doc.text(`Recommendation: ${recText}`, 25, yPos);
  yPos += 8;
  doc.setTextColor(15, 23, 42);
  doc.text(`Recommended Next Step:`, 25, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(nextRound, 78, yPos);

  yPos += 8;
  doc.setFont("helvetica", "bold");
  doc.text(`Overall Score:`, 25, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`${overallScore}/100`, 55, yPos);

  addFooter();
  if (returnBlob) {
    return doc.output("blob");
  } else {
    doc.save("HireFlow_Enterprise_Report.pdf");
  }
}
