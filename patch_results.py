import re

with open("src/app/pages/ResultsDashboardPage.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "Candidate Session • Auto-Analyzed by Vishnu Engine",
    "Candidate Session • AI Telemetry Analysis"
)

content = content.replace(
    "Calculated from Vishnu Tracker telemetry aggregates across {sessionData.length} questions.",
    "Generated from confidence, attention, eye-contact and emotional telemetry signals across {sessionData.length} questions."
)

with open("src/app/pages/ResultsDashboardPage.tsx", "w") as f:
    f.write(content)
