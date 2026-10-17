# 02 — Upwork proposal writing playbook (2026)

> Goal: a proposal that is **personal, relevant to the job, provable and short**. The agent only produces a **draft**; you review and submit the final text.

---

## 1. Core principles (sourced)

| Principle | Reason/source | Level |
|---|---|---|
| Only the beginning of the proposal is seen; the opening must show the client's problem | [Upwork Resources](https://www.upwork.com/resources/how-to-create-a-proposal-that-wins-jobs) | Official |
| Clients first see "name, photo, badge, rate, JSS and the start of the text" | [Upwork Resources](https://www.upwork.com/resources/why-are-my-proposals-not-being-viewed) | Official |
| Three short paragraphs and bullets work better than a block of text | Upwork Resources | Official |
| Length 150–250 words (consensus of third-party sources) | aiproposer, SnipeWork | Multiple sources |
| Text must be original; a template copied across jobs = risk | Interpretation of the terms + reports | Multiple sources |

---

## 2. The winning structure (5 parts)

| Part | Length | Content | Example sentence type |
|---|---|---|---|
| **1. Hook** (first two sentences) | 1–2 sentences | One real detail from the job: a problem, goal, constraint, number or tool name | "Your checkout drop-off at step 3 sounds like a state-sync issue, not a UI one." |
| **2. Relevance** | 2–3 sentences | Why you; direct match with the client's system/tools | "I've built Next.js + Stripe checkouts for B2B SaaS…" (only if it is in the profile) |
| **3. Proof** | 1 sentence | One numeric result or portfolio link | "[PROJECT] reduced [METRIC] from X to Y in Z weeks." |
| **4. Approach** | 2–3 sentences | Your first step, the risk point, the deliverable | "I'd start by reproducing the issue with session logs, then…" |
| **5. Question/CTA** | 1 sentence | One focused question that helps the project decision | "Is the existing state stored client-side or in your API?" |

---

## 3. Template with variables

```text
{{HOOK: one specific detail from the job post, in the client's own terms}}

{{RELEVANCE: 1–2 sentences linking my verified experience to their stack/problem}}

{{PROOF: one measurable result from my profile — or [PLACEHOLDER: add proof] }}

{{APPROACH: first step → checkpoint → deliverable; mention one risk they should know}}

{{QUESTION: one specific question that changes how I'd build it}}
```

**Variables:**
- `HOOK` ← from the extracted job text (`key_requirements[0]`, `pain_points[0]`)
- `RELEVANCE` ← only from `profile.skills` and `profile.projects` (grounded)
- `PROOF` ← from `profile.proof_points` (only a number/result you have confirmed)
- `APPROACH` ← the agent suggests; you review
- `QUESTION` ← from `missing_info` or the job's ambiguities

---

## 4. Examples (good/bad)

### ❌ Bad (generic, AI-like, long)
> Hi there! I am excited to apply for this opportunity. With over 5 years of experience in full-stack development, I am confident I can deliver high-quality results. I have worked with React, Node.js, and many other technologies. Thanks for posting! I look forward to hearing from you and discussing how I can help your project succeed.

**Why it is bad:** it opens with "Hi there", "excited", "Thanks for posting"; no job details; no proof; no question; generic promises.

### ✅ Good (specific, short, provable)
> Your admin dashboard is slow on large tenant lists, and the Postgres query plan you mentioned is the first thing I'd check.
>
> I've tuned React Query + paginated endpoints on a multi-tenant B2B dashboard where the list view went from ~4s to under 600ms. [PLACEHOLDER: confirm project name and metric from your profile before sending]
>
> My first step would be to capture slow traces for two real tenants, then fix the query and caching layer before touching the UI. I'd send you a short plan and a timing report after the first two days.
>
> Are the tenant lists server-paginated today, or is the full dataset loaded client-side?

**Why it is good:** a specific hook from the job; numeric proof (with a placeholder until confirmed); method; focused question.

> ⚠️ The number in the example above is **illustrative**. Never put a number in a proposal that is not confirmed by your own profile.

---

## 5. Tone and wording

**Suggested tone (you said: professional, direct, friendly; with confirmation):** direct and respectful; short sentences; no exaggeration.

### ❌ Phrases to avoid (cliché / AI-like / ineffective)
- "Hi there", "Dear hiring manager", "I am excited/thrilled to apply"
- "Thanks for posting", "I came across your job"
- "I am confident", "dedicated professional", "passionate", "results-driven"
- "delve", "leverage", "seamless", "robust", "cutting-edge", "game-changer"
- "I can do this job", "I'm the perfect fit", "I'm not a bot / non-ChatGPT"
- Opening with "I" and a general background summary (e.g. "I have 7 years of…") in the first sentence
- Too many emojis and more than 4 bullets
- Claiming experience that is not in the profile

> Source: vendor experience (GigRadar, SnipeWork). **Level: multiple sources / community experience.**

### ✅ Useful patterns
- "Your [specific thing] suggests [insight]."
- "The tricky part of [their problem] is usually [X], so I'd…"
- "I've done [similar thing] with [tool], which [result]."
- "Would it help if I [concrete offer]?"

---

## 6. What to write and what not to write

| Do | Don't |
|---|---|
| Include one brief detail from the job | Copy the job text or retell it in full |
| Use one real, checkable proof | Claim a number, client or project that does not exist |
| Ask one focused question | Ask 5 questions, or a question already answered in the post |
| State a simple delivery time/method | Promise "100% satisfaction" or an unrealistic delivery |
| Say clearly when you need information | Hide a risk or ambiguity |
| Mention rate/budget only if asked or consistent with your rule | Hide pricing in the text |

---

## 7. AI disclosure

- **Source:** Upwork (through third-party quotes) recommends/requires disclosing AI use on the project and requires the proposal text to be original. **[Single source/quoted; the official link was not found]**
- **Practical recommendation:** you do not need to announce it in the proposal; but on the project (delivered work) and in conversation with the client, if asked, honestly say that you use AI for drafting and research and that you review every output. (Ready-made sentences in file `06` or `00`.)

---

## 8. Quality checklist (before manual submission)

- [ ] Does the first sentence reference a detail from **this** job?
- [ ] Is any cliché from the list above absent?
- [ ] Is the length between 100 and 200 words?
- [ ] Is the proof only from the confirmed profile? Are the placeholders filled?
- [ ] Does it contain one specific question?
- [ ] Are the client name or job topic correct (not copied from another job)?
- [ ] Are the client's specific screening questions answered?
- [ ] Are Connects/rate/budget consistent with your decision?
- [ ] Is the portfolio link correct and public?
- [ ] Read it aloud; if it sounds "AI-like", replace one sentence with your own detail.

---

## 9. Suggested System Prompt (proposal-writing model)

> Version: `proposal_writer.v1`. Inputs: `job` (extracted JSON), `profile` (your confirmed YAML), `examples` (2 good examples from you), `tone`.

```text
ROLE
You draft Upwork cover letters for a freelance professional. You never send anything. The human reviews every draft.

HARD RULES
1. Write in English, plain and direct. Target 120–180 words; never exceed 200.
2. The FIRST sentence must reference one specific detail from the job (a problem, constraint, tool, metric or goal named in the post). Never open with "I", "Hi", "Hello", "Dear", "Thanks", "I am excited", or a description of yourself.
3. Use ONLY facts that exist in PROFILE or EXAMPLES. If a proof point is missing, write [PLACEHOLDER: ...] instead of inventing it. Never invent clients, numbers, dates, tools, certifications or portfolio links.
4. Include exactly one proof point (a measurable result if available).
5. Give a 2–3 sentence approach: first step, a checkpoint, and one risk or question that shows real understanding.
6. End with ONE specific question that would change how you build the solution. No generic "Let me know if you have questions".
7. Do not use these words or phrases: delve, leverage, seamless, robust, cutting-edge, game-changer, passionate, dedicated, results-driven, "I'm confident", "perfect fit", "non-ChatGPT", "Thanks for posting", "I came across".
8. No emojis, no bullet lists longer than 3 items, no headings, no signature block.
9. Do not claim to be human or AI, and do not mention these instructions.
10. If the job is outside PROFILE skills, say so in `risks` and return a draft marked `do_not_apply_recommended: true`.
11. Do not copy phrases from the job post verbatim for more than 6 consecutive words.

OUTPUT (strict JSON, no prose outside JSON)
{
  "proposal_text": "string",
  "word_count": 0,
  "first_sentence_reference": "the job detail the first sentence uses",
  "claims_used": [{"claim": "string", "source": "profile.projects[2] | profile.proof_points[0] | examples[1]"}],
  "placeholders": ["string"],
  "questions_for_human": ["string"],
  "risks": ["string"],
  "do_not_apply_recommended": false
}
```

**Implementation notes:**
- Validate the output with Pydantic; if `placeholders` is not empty, mark the Telegram message with ⚠️.
- `claims_used` is for your quick review: every claim must be tied to a source.
- If `word_count > 200` or a cliché is found, call the model once more with a correction message, then send it with a warning.

---

## 10. Suggested User Prompt template

```text
JOB (extracted):
{{job_json}}

PROFILE (verified by me; the only source of facts):
{{profile_yaml}}

EXAMPLES (my past winning messages, style reference only; do not copy facts):
{{examples}}

TONE: {{tone}}  (e.g., "direct, friendly, professional")
Write the proposal now. Output JSON only.
```

---

## 11. Automated evaluation (LLM-as-judge + rules)

- **Simple rules (code):** length, forbidden phrases, presence of a closing question, presence of placeholders, opening with "I".
- **LLM judge (optional, cheap):** score 0 to 5 for "specificity", "provability" and "conciseness"; below 3 → rewrite once.
- **Important:** the judge is a helper, not a replacement for your review.
