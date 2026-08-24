<!-- DO NOT INCLUDE IN OUTPUT
Agent note: task:status must render as exactly one marker:
⬜️ not started
🟨 in progress
✅ completed
⚠️ validation gap or follow-up risk
Render only the marker before the title, for example:
- ✅ Add CLI routing for `aix templates list`.
Never render words such as "not started -". -->
- {{ task:status }} {{ task:title }}
