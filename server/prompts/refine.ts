export default `TASK: Apply a TARGETED EDIT to the existing Jira issue below. Do NOT regenerate from scratch.

Current Jira issue draft (JSON):
{{CURRENT_DRAFT}}

The user wants this specific change:
"{{REQUEST}}"
{{ORIGINAL_CONTEXT}}
{{CONVERSATION_HISTORY}}
Relevant scope(s):
{{SCOPE_DETAILS}}

RULES:
- Return the COMPLETE updated JSON with ALL original fields preserved.
- ONLY modify fields directly affected by the user's change request above.
- Keep the exact same structure, title prefix [{{PREFIX}}], and all unaffected content.
- If the user asks to add/change something in the title or description, surgically edit those strings — do not rewrite unrelated sections.
- Preserve ALL sections of the description unless the change specifically targets them.
- Follow all system output rules (status="enough" JSON).
`
