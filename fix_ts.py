import re

with open("src/app/pages/LiveInterviewPage.tsx", "r") as f:
    content = f.read()

# Fix 1: errText
content = re.sub(r"const errText = await res\.text\(\);", "throw new Error(await res.text());", content)
content = re.sub(r"throw new Error\(await res\.text\(\)\);\n\s*throw new Error\(\"Failed\"\);", "throw new Error(await res.text());", content)

# Fix 2: utterance.onerror = (e) =>
content = re.sub(r"utterance\.onerror = \(e\) => \{", "utterance.onerror = () => {", content)

# Fix 3: personaId
content = re.sub(r"const personaId =[^;]+;(?:\s*//.*)?\n", "", content)

# Fix 4: requestFullscreen
# The current code might have:
# if (document.documentElement.requestFullscreen) {
# }
# or similar.
# I'll replace the whole onClick handler for fullscreen.
pattern = r"if \(document\.documentElement\.requestFullscreen\) \{\s*\}"
content = re.sub(pattern, "document.documentElement.requestFullscreen().catch(() => {});", content)

with open("src/app/pages/LiveInterviewPage.tsx", "w") as f:
    f.write(content)

with open("src/app/utils/mediaCleanup.ts", "r") as f:
    content = f.read()

content = re.sub(r"const allEnded = (.*?);\n", r"\1;\n", content)

with open("src/app/utils/mediaCleanup.ts", "w") as f:
    f.write(content)
