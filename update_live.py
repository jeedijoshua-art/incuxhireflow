import re

with open("src/app/pages/LiveInterviewPage.tsx", "r") as f:
    content = f.read()

# 1. Move handlers outside useEffect
handlers = """
  const handleFullscreenChange = () => {
    if (isEndingInterviewRef.current) return;
    if (!document.fullscreenElement) {
      setViolations(prev => [...prev, `Exited fullscreen at ${new Date().toLocaleTimeString()}`]);
      alert("Interview Integrity Violation Detected: Exited Fullscreen. Please return to fullscreen.");
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log(e));
      }
    }
  };

  const handleVisibilityChange = () => {
    if (isEndingInterviewRef.current) return;
    if (document.hidden) {
      setViolations(prev => [...prev, `Tab hidden/switched at ${new Date().toLocaleTimeString()}`]);
    }
  };

  const handleBlur = () => {
    if (isEndingInterviewRef.current) return;
    setViolations(prev => [...prev, `Window lost focus at ${new Date().toLocaleTimeString()}`]);
  };

  useEffect(() => {
"""

content = re.sub(r'  useEffect\(\(\) => \{', handlers, content)

# 2. Remove handlers from inside useEffect
content = re.sub(r'    // Violation Tracking\n.*?    const handleBlur = \(\) => \{\n.*?    \};\n', '    // Violation Tracking\n', content, flags=re.DOTALL)

# 3. Add explicit flush in handleEndInterview
end_logic = """  const handleEndInterview = () => {
    isEndingInterviewRef.current = true;
    
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleBlur);

    // Save final turn"""
content = content.replace("""  const handleEndInterview = () => {
    isEndingInterviewRef.current = true;
    
    // Save final turn""", end_logic)

# 4. Remove exitFullscreen from useEffect cleanup
content = content.replace("""      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }""", "")

with open("src/app/pages/LiveInterviewPage.tsx", "w") as f:
    f.write(content)
