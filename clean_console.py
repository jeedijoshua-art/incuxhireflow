import os
ALLOWED_TAGS = ["[ERROR]", "[WARNING]", "[API]", "[INTERVIEW]", "[SPEECH]", "[TELEMETRY]"]
with open("src/app/pages/LiveInterviewPage.tsx", "r") as f:
    lines = f.readlines()
new_lines = []
for line in lines:
    if "console." in line and not any(tag in line for tag in ALLOWED_TAGS):
        continue
    new_lines.append(line)
with open("src/app/pages/LiveInterviewPage.tsx", "w") as f:
    f.writelines(new_lines)
