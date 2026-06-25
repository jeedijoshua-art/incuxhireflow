import re
import os

filepath = "src/app/pages/LiveInterviewPage.tsx"
with open(filepath, "r") as f:
    content = f.read()

# 1. errText block replacements
content = re.sub(
    r'const errText = await res\.text\(\);\s*console\.error\(\"\[DEBUG\] Fetch Next Question Error Body:\", errText\);\s*throw new Error\(\"Failed\"\);',
    r'throw new Error(await res.text());',
    content
)

content = re.sub(
    r'const errText = await res\.text\(\);\s*console\.error\(\"\[DEBUG\] Submit Answer Error Body:\", errText\);\s*throw new Error\(\"Failed\"\);',
    r'throw new Error(await res.text());',
    content
)

content = re.sub(
    r'const errText = await res\.text\(\);\s*console\.error\(\"\[STT_RESPONSE_BODY\] Error Body:\", errText\);\s*throw new Error\(\"Failed\"\);',
    r'throw new Error(await res.text());',
    content
)

# 2. personaId at line 206
content = re.sub(
    r'const personaId =\s*localStorage\.getItem\(\"hireflow_selected_voice\"\)\s*\|\|\s*\"david\";\s*console\.log\(\s*\"\[VOICE_PERSONAS_LOADED\]',
    r'console.log(\n      "[VOICE_PERSONAS_LOADED]',
    content
)

# Also remove console.log(`[VOICE_SELECTED] ${personaId}`); that follows it
content = re.sub(
    r'console\.log\(`\[VOICE_SELECTED\] \$\{personaId\}`\);',
    r'',
    content,
    count=1 # only remove the second one
)

# 3. wsRef unused
content = re.sub(
    r'const wsRef = useRef<WebSocket \| null>\(null\);\n',
    r'',
    content
)

# 4. 'e' unused in requestFullscreen catch
content = re.sub(
    r'\.catch\(\(e\) => console\.log\(e\)\);',
    r'.catch(() => {});',
    content
)

# 5. requestFullscreen check
# Remove the 'if (document.documentElement.requestFullscreen)' wrappers
content = re.sub(
    r'if\s*\(\s*document\.documentElement\.requestFullscreen\s*\)\s*\{\s*(await\s*document\.documentElement\.requestFullscreen\(\);)\s*\}',
    r'\1',
    content
)

content = re.sub(
    r'if\s*\(\s*document\.documentElement\.requestFullscreen\s*\)\s*\{\s*(document\.documentElement\.requestFullscreen\(\)\.catch\([^)]+\);)\s*\}',
    r'\1',
    content
)

# 6. e in utterance onerror
content = re.sub(
    r'utterance\.onerror = \(e\) => \{',
    r'utterance.onerror = () => {',
    content
)

with open(filepath, "w") as f:
    f.write(content)

# Fix mediaCleanup.ts
media_filepath = "src/app/utils/mediaCleanup.ts"
with open(media_filepath, "r") as f:
    media_content = f.read()

media_content = re.sub(
    r'const allEnded = activeResources\.every\(\(r\) => r\.cleaned\);',
    r'activeResources.every((r) => r.cleaned);',
    media_content
)

with open(media_filepath, "w") as f:
    f.write(media_content)

