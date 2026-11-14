# Screen wireframes (Phase 2)

These sketches define information order and actions, not final visual styling. See the [product definition](product-definition.md) for workflow and the [permissions contract](permissions-and-data.md) for visibility.

## Candidate: public job detail and application

```text
┌──────────────────────────────────────────────────────────────────┐
│ Logo                    Find jobs             Sign in / Profile │
├──────────────────────────────────────────────────────────────────┤
│ Job title                         Location · Work type · Salary  │
│ Organization · Published date                 [Apply to job]    │
│                                                                  │
│ What you will do                                                 │
│ Required criteria             Preferred criteria                │
│ Hiring process and expected updates                              │
│                                                                  │
│ Application: profile → job questions → review → submit           │
│ Resume upload (optional unless job explicitly requires one)     │
│ Extracted fields: [Edit]  Answers: [Edit]                        │
│ AI processing notice and privacy link       [Submit application] │
└──────────────────────────────────────────────────────────────────┘
```

The candidate can read the job before signing in. Submission shows a receipt and the next expected update. An extraction error never silently changes the candidate's answers.

## Candidate: application status

```text
┌──────────────────────────────────────────────────────────────────┐
│ My applications                                  Notifications  │
├──────────────────────────────────────────────────────────────────┤
│ Job / organization     Status       Submitted     [View]         │
│ ...                                                              │
├──────────────────────────────────────────────────────────────────┤
│ Selected job                                                     │
│ Status timeline: Received → In review → Interview → Decision    │
│ Latest message and next step                                     │
│ Submitted profile and answers               [Withdraw]          │
└──────────────────────────────────────────────────────────────────┘
```

Show only candidate-visible events. Do not expose internal reviewer notes or an AI score as the official outcome.

## Recruiter: job pipeline and review

```text
┌──────────────────────────────────────────────────────────────────┐
│ Jobs     Applicants     Notifications          Organization      │
├──────────────────────────────────────────────────────────────────┤
│ Job title / state          [Edit rubric]  [Pause]  [Share job]   │
│ Filters: stage · criterion · date · reviewer     Search         │
│ Applicant     Stage        Review state     Last update [Open]  │
│ ...                                                              │
├──────────────────────────────────────────────────────────────────┤
│ Selected application                                             │
│ Original resume and answers | Criteria and cited evidence        │
│ Human rating and notes for each criterion                        │
│ AI status: ready / pending / unavailable     [Report an error]  │
│ [Save review] [Invite interview] [Reject with reason]            │
└──────────────────────────────────────────────────────────────────┘
```

The recruiter can review without AI. Source material remains visible next to any AI summary. Decision actions ask for a reason and show the candidate message before sending it.

## Admin: organization workspace

```text
┌──────────────────────────────────────────────────────────────────┐
│ Overview     Members     Policies     Activity     Data requests │
├──────────────────────────────────────────────────────────────────┤
│ Active jobs · Pending reviews · Delivery failures                │
│                                                                  │
│ Members: name · role · status           [Invite] [Revoke]       │
│ Policies: retention · reapplication · AI features [Edit]        │
│ Audit: actor · action · record · time · outcome [Filter]         │
└──────────────────────────────────────────────────────────────────┘
```

Admin actions are scoped to their organization. Applicant document access is logged. Changes to retention or AI settings show their effect before confirmation.

## Shared interface rules

- On narrow screens, tables become labeled cards and the primary action stays reachable without horizontal scrolling.
- Every form has visible labels, validation text, keyboard support, and a clear save/submission state.
- Status is conveyed by text as well as color. Processing and delivery failures offer a retry or a human support path.
- Private information appears only after the API authorizes the current user and record; UI navigation is not a security boundary.
