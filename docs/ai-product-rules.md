# AI product rules (Phase 2)

AI is optional assistance within the [new product](product-definition.md). The application must support the full hiring workflow without an AI provider. These rules apply to prompts, models, local fallbacks, product copy, and evaluations.

## Allowed uses

| Use | Output | Required human control |
| --- | --- | --- |
| Resume/profile extraction | Structured fields with source location and uncertainty | Candidate can correct their profile; recruiter can inspect the original application. |
| Job description drafting | Editable draft based on recruiter-provided facts | Recruiter approves before publication. |
| Criterion evidence summary | Evidence found, evidence absent, and exact source passages for each published job criterion | Reviewer reads source material and records their own assessment. |
| Interview question drafting | Editable questions tied to the approved rubric | Recruiter selects questions and uses consistent scorecards. |
| Candidate coaching | Optional suggestions for resume clarity, skills, and interview preparation | Candidate chooses whether to use them; coaching does not alter employer review. |

## Prohibited uses in the first release

- No automatic rejection, hiring, offer, or stage change based on AI output.
- No inferred protected traits, personality, honesty, or cultural fit scores.
- No “cheater” label from keyword density, hidden text, or an LLM guess. Technical document anomalies may be flagged for file-quality review without making a claim about intent.
- No unsupported numerical claim that an applicant is a specified percentage fit or that the model predicts job success.
- No silent use of a different fallback model or heuristic while presenting results as equivalent.

## Output contract

Every AI result stores: task type, input references, rubric version, prompt version, model/provider version, time, processing status, structured result, citations to source spans, and error or uncertainty flags. Separate applicant-provided claims from independently verified facts. If a passage cannot be cited, label it as an interpretation or omit it. The UI shows when analysis is pending, failed, or unavailable; it never invents a successful result.

Resume and job text are untrusted input. The AI service must ignore embedded instructions that attempt to change its task, disclose data, or alter scoring. Validate structured output against a schema, bound input size, redact unnecessary personal information, and enforce timeouts and cost limits. Human review is required before a summary is used in a decision.

## Evaluation before launch

Create a permissioned, representative test set of jobs and applications with human-checked reference labels. Version the set and avoid using real candidate data without an appropriate basis. Measure extraction accuracy, citation correctness, unsupported claims, consistency across formats, failure rate, latency, cost, and reviewer correction rate. Review disparate error patterns where lawful and feasible. Do not ship a new prompt or model merely because its prose sounds better; compare it against the previous version on the same test set.

## Candidate transparency

Tell candidates which parts of the process use AI, which information is sent to an external provider, and how to contact a person about an error. A candidate correction to extracted profile data must be reflected in future use. AI coaching is separate from the organization's decision record and can be turned off by the candidate.
