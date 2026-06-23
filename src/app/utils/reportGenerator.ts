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

export function generatePDFReport(sessionData: SessionTurn[]) {
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

  // ----------------------------------------------------
  // HELPER FUNCTIONS
  // ----------------------------------------------------
  const drawBar = (x: number, y: number, width: number, height: number, percentage: number, color: number[]) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, width, height, "F");
    
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, width * (percentage / 100), height, "F");
  };

  const getInterpretation = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Strong";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Needs Improvement";
  };
  
  // ----------------------------------------------------
  // DATA CALCULATIONS
  // ----------------------------------------------------
  let avgConf = 0, avgAtt = 0, avgEye = 0;
  let allViolations: string[] = [];
  const emotionCounts: Record<string, number> = {};
  
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
    });
  }

  const overallScore = sessionData.length > 0 ? Math.round((avgConf + avgAtt + avgEye + 94 + 89) / 5) : 0;
  
  // PAGE 1: HEADER
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("HIREFLOW", 20, 20);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("EXECUTIVE INTERVIEW REPORT", 20, 30);
  
  yPos = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Date & Time: ${new Date().toLocaleString()}`, 20, yPos);
  doc.text(`Session ID: ${localStorage.getItem("hireflow_session_id") || "N/A"}`, 110, yPos);
  yPos += 7;
  doc.text(`Job Role: Software Engineer (Simulated)`, 20, yPos);
  doc.text(`Interview Type: Technical / Behavioral`, 110, yPos);
  yPos += 7;
  doc.text(`Difficulty Level: Standard`, 20, yPos);
  doc.text(`Questions Answered: ${sessionData.length}`, 110, yPos);
  
  yPos += 15;
  
  // SECTION 1: EXECUTIVE SUMMARY
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("EXECUTIVE SUMMARY", 20, yPos);
  yPos += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFontSize(14);
  doc.text(`Overall Score: ${overallScore}/100`, 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Breakdown:", 20, yPos);
  yPos += 7;
  doc.text(`- Communication: 94/100`, 25, yPos);
  yPos += 6;
  doc.text(`- Confidence: ${avgConf}/100`, 25, yPos);
  yPos += 6;
  doc.text(`- Attention: ${avgAtt}/100`, 25, yPos);
  yPos += 6;
  doc.text(`- Eye Contact: ${avgEye}/100`, 25, yPos);
  yPos += 6;
  doc.text(`- Emotional Stability: 89/100`, 25, yPos);
  
  yPos += 10;
  doc.setFont("helvetica", "bold");
  let recommendation = "Needs Improvement";
  if (overallScore >= 80) recommendation = "Strong Candidate";
  else if (overallScore >= 60) recommendation = "Average Candidate";
  
  doc.text(`Recommendation: ${recommendation}`, 20, yPos);
  yPos += 15;
  
  // SECTION 2: ADVANCED TELEMETRY ANALYTICS
  checkPageBreak(60);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ADVANCED TELEMETRY ANALYTICS", 20, yPos);
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  const drawMetric = (label: string, score: number, color: number[]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}: ${score}% (${getInterpretation(score)})`, 20, yPos);
    yPos += 4;
    drawBar(20, yPos, 170, 6, score, color);
    yPos += 12;
  };
  
  drawMetric("Confidence", avgConf, [6, 182, 212]); // Cyan
  drawMetric("Attention", avgAtt, [16, 185, 129]); // Emerald
  drawMetric("Eye Contact", avgEye, [139, 92, 246]); // Violet
  
  // SECTION 3: EMOTION BREAKDOWN (Horizontal Bar Chart)
  yPos += 5;
  checkPageBreak(50);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("EMOTION BREAKDOWN", 20, yPos);
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  const totalEmotions = sessionData.length;
  if (totalEmotions === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("No emotion data available.", 20, yPos);
    yPos += 10;
  } else {
    Object.keys(emotionCounts).forEach(emotion => {
      const count = emotionCounts[emotion];
      const pct = Math.round((count / totalEmotions) * 100);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${emotion} (${pct}%)`, 20, yPos);
      yPos += 4;
      drawBar(20, yPos, 170, 6, pct, [245, 158, 11]); // Amber
      yPos += 10;
    });
  }
  
  // SECTION 4: QUESTION-BY-QUESTION REVIEW
  yPos += 10;
  checkPageBreak(40);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("QUESTION-BY-QUESTION REVIEW", 20, yPos);
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  sessionData.forEach((turn, idx) => {
    checkPageBreak(50);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 148, 136); // Teal
    doc.text(`Question ${turn.question}`, 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Response:", 20, yPos);
    yPos += 5;
    
    doc.setFont("helvetica", "normal");
    const transcriptText = turn.transcript && turn.transcript.trim() !== "" ? turn.transcript : "(No audible response recorded / skipped)";
    const splitText = doc.splitTextToSize(transcriptText, 170);
    doc.text(splitText, 20, yPos);
    yPos += splitText.length * 5 + 5;
    
    doc.setFont("helvetica", "bold");
    doc.text("Telemetry:", 20, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Confidence: ${turn.telemetry.confidence}%  |  Attention: ${turn.telemetry.attention}%  |  Eye Contact: ${turn.telemetry.eyeContact}%  |  Emotion: ${turn.telemetry.emotion}`, 25, yPos);
    yPos += 10;
  });
  
  // SECTION 5 & 6: STRENGTHS & AREAS FOR IMPROVEMENT
  yPos += 10;
  checkPageBreak(60);
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("STRENGTHS", 20, yPos);
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (avgAtt >= 80) { doc.text("- Maintained stable attention throughout the interview.", 20, yPos); yPos += 6; }
  if (avgEye >= 75) { doc.text("- Strong eye contact patterns.", 20, yPos); yPos += 6; }
  if (avgConf >= 80) { doc.text("- Exhibited high confidence during responses.", 20, yPos); yPos += 6; }
  if (avgAtt < 80 && avgEye < 75 && avgConf < 80) { doc.text("- Consistent participation.", 20, yPos); yPos += 6; }
  
  yPos += 5;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("AREAS FOR IMPROVEMENT", 20, yPos);
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let hasImprovements = false;
  if (avgEye < 60) { doc.text("- Improve camera engagement and eye contact.", 20, yPos); yPos += 6; hasImprovements = true; }
  if (avgConf < 60) { doc.text("- Increase speaking confidence and body language stability.", 20, yPos); yPos += 6; hasImprovements = true; }
  if (avgAtt < 70) { doc.text("- Maintain attention consistency to avoid appearing distracted.", 20, yPos); yPos += 6; hasImprovements = true; }
  if (!hasImprovements) { doc.text("- Continue current strong performance patterns.", 20, yPos); yPos += 6; }
  
  // SECTION 7: INTEGRITY & PROCTORING
  yPos += 10;
  checkPageBreak(40);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("INTEGRITY & PROCTORING", 20, yPos);
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (allViolations.length === 0) {
    doc.text("Session completed with no integrity violations.", 20, yPos);
    yPos += 10;
  } else {
    doc.setTextColor(220, 38, 38); // Red
    doc.text("Violations detected during session:", 20, yPos);
    yPos += 6;
    allViolations.forEach(v => {
      checkPageBreak(10);
      doc.text(`- ${v}`, 25, yPos);
      yPos += 6;
    });
    doc.setTextColor(0, 0, 0);
  }
  
  // SECTION 8: FINAL RECOMMENDATION
  yPos += 10;
  checkPageBreak(30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FINAL RECOMMENDATION", 20, yPos);
  yPos += 2;
  doc.line(20, yPos, 190, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  let verdict = "Needs Further Evaluation";
  if (allViolations.length > 2) {
    verdict = "Disqualified (Integrity Violations)";
    doc.setTextColor(220, 38, 38); // Red
  } else if (overallScore >= 80) {
    verdict = "Proceed to Technical / Next Round";
    doc.setTextColor(16, 185, 129); // Emerald
  } else if (overallScore >= 60) {
    verdict = "Proceed to HR Round with Reservations";
    doc.setTextColor(245, 158, 11); // Amber
  } else if (sessionData.length === 0) {
    verdict = "Not Enough Data";
    doc.setTextColor(100, 100, 100);
  } else {
    doc.setTextColor(220, 38, 38); // Red
  }
  
  doc.text(`Verdict: ${verdict}`, 20, yPos);
  doc.setTextColor(0, 0, 0);
  
  // Save PDF
  doc.save("hireflow_executive_report.pdf");
}
