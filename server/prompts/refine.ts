export default `Current Jira issue draft:
{{CURRENT_DRAFT}}

Requested refinement:
{{REQUEST}}

Relevant scope(s):
{{SCOPE_DETAILS}}

Revise the existing Jira issue based on the requested refinement.
Preserve accurate details from the current draft unless the request explicitly changes them.
Keep the result to one Jira issue and follow all system output rules.
Title prefix to use: [{{PREFIX}}].
`
