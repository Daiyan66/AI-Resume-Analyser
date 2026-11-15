# Phase 8: optional AI drafting

Recruiters can request an editable job description draft from an explicitly configured provider. This feature is off by default for every organization. It never sends candidate profiles or resumes, and it does not change hiring stages or decisions. A recruiter reviews and edits the text before saving or publishing a job.

## Local checklist

1. In **Admin workspace**, enable AI assistance for a test organization.
2. Configure `AI_API_KEY` and `AI_MODEL` in an ignored local `.env` file before starting Compose. The default provider endpoint is OpenRouter's chat completions API. A separate `AI_ENDPOINT` can be set for a compatible service when running the API outside Compose.
3. In **Recruiter workspace**, enter a job title, factual description, and requirements. Choose **Suggest job description**. The API sends those facts to the configured provider and returns a preview; it does not save the job or publish anything.
4. Read the preview, check every claim, and choose **Use as editable description** only if appropriate. Save the draft and publish it separately.
5. Turn AI assistance off and verify that a new request is denied. Remove the key and verify that the editor remains usable without AI.

The API stores the supplied facts, generated text, model, prompt version, actor, organization, and time for audit. A failed, empty, or oversized provider response creates no draft. The feature has a 25-second provider timeout. The provider must be contractually suitable for the data supplied by the hiring organization.

Resume extraction, cited applicant evidence, AI evaluations, and candidate coaching are **not implemented in this increment**. They need a representative evaluation set and careful review of private-data handling before launch.
