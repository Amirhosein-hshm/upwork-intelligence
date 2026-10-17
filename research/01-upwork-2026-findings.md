# 01 — Upwork research findings (Parts A and B)

- Research date: 2026-10-15
- Confidence labels:
  - **[Official]**: read on an official Upwork page / official documentation (highest credibility)
  - **[Multiple sources]**: repeated in several independent sources, but no direct official source was read
  - **[Single source]**: only one third-party source (SEO/vendor blog); must be verified before relying on it
  - **[Unconfirmed]**: could not verify
- Third-party vendor sources (GigRadar, aiproposer, etc.) often have **commercial interests** and disagree with each other. Treat them as "community opinion/experience", not fact.

---

## ⛔ Critical finding: registration legality (country restriction)

| Topic | Finding | Source | Level |
|---|---|---|---|
| Eligibility | Upwork states explicitly: "Businesses or individuals in the following regions and countries are not permitted to register for accounts or utilize our platform: **Iran**" and "Any other country or region restricted by law". Reason: United States law (OFAC). | [Who's eligible to join and use Upwork?](https://support.upwork.com/hc/en-us/articles/211067778-Who-s-eligible-to-join-and-use-Upwork) | **[Official]** |
| Upwork API | API access (OAuth and key) also makes no sense for users resident in restricted countries; this is an inference from the same Eligibility section. | Same page | Inference |
| Circumvention | Reddit user reports show some people have tried creating accounts through a third party or VPN and were permanently banned; Upwork also detects re-registration by ID. | Reddit r/Upwork (several threads, 2024–2025) | [Single source / user experience] |

**User status (statement of 2026-10-16):** the user has stated that they are **outside Iran** and have no restriction. On that basis this project proceeds on the assumption of "a real user account and address in an allowed country". **Only the user can confirm this** (file `00`, question 1): Upwork judges by the country where the account is registered and the real address, not by server location or VPN.

**Practical conclusion:** Upwork cannot legally be used by someone resident in Iran. For a user outside Iran, the main condition is that the account was created in their real name and real address. No "workaround" (third-party account, VPN for registration, another address) is recommended; it violates Upwork's terms and leads to a ban.

---

## Part A — Applying on Upwork in 2026

### A1. Structure of the application process
| Finding | Source | Level |
|---|---|---|
| Proposal form fields include Cover Letter, rate/budget, Milestones, answers to client questions, Attachments, etc.; the API documentation shows a proposal is a `VendorProposal` object with `coverLetter`, `terms` (including Milestones/Rate), `attachments`, `projectPlan` and `annotations`. | [API Documentation (Upwork GraphQL)](https://www.upwork.com/developer/documentation/graphql/api/docs/index.html) | **[Official]** |
| `createJobProposal` (Mutation) exists in the official docs with the description "Create a new proposal using the new flow" and the "Submit Proposal" permission. | Same page | **[Official]** |
| UI changes in 2025–2026: Uma (AI assistant) for drafting proposals (announced by Upwork in October 2024 and updated Spring 2026). | [Fast Company](https://www.fastcompany.com/91210506/upwork-unveils-new-capabilities-for-its-uma-ai-platform) (2024); [Being Guru](https://beingguru.com/upworks-new-ai-agent-uma-what-it-means-for-freelancers-in-2026/) (2026) | [Multiple sources] |
| Exact details of the current application form UI (field order, Boost, Specialized Profile) | Unconfirmed; must be checked with a real account | [Unconfirmed] |

### A2. Connects
| Finding | Source | Level |
|---|---|---|
| Connects are tokens spent on submitting proposals, Boost and the Availability Badge. | [Understanding and using Connects](https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects) | **[Official]** |
| The number of Connects **varies by job** and is set by project size, scope and market demand; the required amount is shown in the job post itself. | Same | **[Official]** |
| Boost: a short auction; you set the maximum Connects and the final amount may be lower; Boost moves you up the list. | Same | **[Official]** |
| Availability Badge: weekly spend with a cap of your choice; the price changes with demand. | [About the Availability Badge](https://support.upwork.com/hc/en-us/articles/17935107001107--About-the-Availability-Badge) | **[Official]** |
| Free bonuses: 30 Connects per badge (Rising Talent, Top Rated, Top Rated Plus) with a cap of 90; 10 Connects for the first successful Boost; 12 Connects for submitting ≥3 proposals totalling ≥54 Connects (twice a month, "being tested"). | Same Connects article | **[Official]** |
| The **12-Connects bonus** is being tested and is not granted to everyone. | Same | **[Official]** |
| Connects roll over unless they expire; there is no holding cap. | [Help Center search](https://support.upwork.com/hc/en-us/search?query=connects) | [Multiple sources] |
| **Price per Connect = $0.15** | Third-party sources (aiproposer, getmany, digistore, etc.) | [Multiple third-party sources] — **not confirmed on the official page I read** |
| **Connects per proposal**: third parties report 2–16, with a median of 6 or 16 (a large conflict). | aiproposer (2026-08), gigradar (2026-08), upwex | **[Conflict]** — must be collected from real job posts |
| Freelancer Plus price: $14.99 (aiproposer) vs $19.99 (getmany and gigradar). | Third-party sources | **[Conflict]** — not confirmed on the official page |
| Freelancer Plus: 80 (2023) vs 100 (2026) Connects per month. | freelancemvp (2023), 2026 sources | **[Conflict]** — most recent: 100 (2026) from several sources |
| Free monthly Connects: 10 (third-party sources) | Third-party sources | [Single source] — the official text I saw does not state a number |

**Connects strategy (reasonable inference):** set the monthly budget by "cost per reply", not cost per proposal. Before deciding, log the actual Connects per job and the reply rate for 2–3 weeks.

### A3. Algorithm and ranking
| Finding | Source | Level |
|---|---|---|
| Clients initially see only the beginning of the Cover Letter, name, photo, badge, rate and Job Success Score (JSS). | [Upwork Resources: Why are my proposals not being viewed?](https://www.upwork.com/resources/why-are-my-proposals-not-being-viewed) | **[Official]** |
| When there are many proposals, Upwork shows the closest matches first; signals: profile, skills, history, JSS, title and overview. | Same | **[Official]** |
| Upwork speaks of a "Predictive Compatibility Engine" and ML for ranking, and response speed / early submission matters. | upwex.io (2026-04) | [Single source] — **unconfirmed** |
| Uma Recruiter shortlisting in the Basic plan (Spring 2026) | Being Guru, uphunt, etc. | [Single source / multiple third parties] — not officially confirmed |
| "Proposals submitted within 15–60 minutes get 5–10% more replies" | upwex.io | [Single source] — **unconfirmed** |

### A4. Cover Letter best practices in 2026
| Finding | Source | Level |
|---|---|---|
| Only the first few lines are visible in the list; the opening must show the client's problem. | [Upwork Resources: How To Create a Proposal That Wins Jobs](https://www.upwork.com/resources/how-to-create-a-proposal-that-wins-jobs) (2026-06-24) | **[Official]** |
| Three short paragraphs; bullet points; avoid long blocks of text. | Same | **[Official]** |
| Summary opening, Relevance, Proof (one numeric result), Next step/question. | Several threads/blogs (SnipeWork, aiproposer, upcat) | [Multiple sources] |
| Ideal length: 150 to 250 words (most agreement); some say under 150. | aiproposer (2026), SnipeWork (2026) | [Multiple sources] |
| The phrases "Thanks for posting" and "Many freelancers" reduce replies according to vendor data (n=213; a 5.5 percentage-point difference). | GigRadar (2026-05) | [Single source / vendor] |
| "Hi there, non-ChatGPT generated proposal" has a negative effect (vendor data) | GigRadar (2026-05) | [Single source / vendor] |
| Upwork claims to have an AI-text detection guide listing patterns such as "Additionally" and "However". | GigRadar (citing an official guide) | **[Unconfirmed]** — the guide link was not found |

### A5. Upwork's attitude toward AI proposals
| Finding | Source | Level |
|---|---|---|
| Upwork allows AI assistance, but the result must be **original (authentic)** and comply with the terms of the relevant AI platform. | Quoted from Upwork's guide in Beingguru (2026-09) and Convertix (2026-03) | [Multiple third-party sources with similar quotes] |
| The "Ethics of AI on Upwork" guide recommends/requires disclosing AI use to the client ("Always disclose to clients whether you use AI-generated content or tools"). | Beingguru (quoting the guide) | [Single quoted source] — I did not find the official link |
| Terms of Use (September 2025 version): "you may not misrepresent your work or proposal with AI if the client has prohibited it or third-party rights would be violated." | Reddit (summary of the text, 2025-09) | [Single source / summary] — the full text should be checked in the Legal Center |
| Since January 2026, Upwork may use work/messages to train AI unless the user opts out. | Beingguru (2026-09) | [Single source] — **unconfirmed**; check your AI preferences yourself |

### A6. Job types
| Finding | Level |
|---|---|
| Fixed-price (Milestones) vs Hourly; Hourly is covered by the Upwork Guarantee and based on the Work diary (official documentation). | [Official] |
| Enterprise, Contract-to-hire and experience level in Search API filters (e.g. `enterpriseOnly_eq`, `contractorTier_eq`, `jobType_eq`) | [Official] (filters) |
| Proposal strategy differs by job type: a reasonable inference (Fixed for a defined outcome, Hourly for a long-term collaboration). | Inference |

### A7. Red flags
| Finding | Level |
|---|---|
| Official documentation explains "Client Verified Payment" in the `verifiedPaymentOnly_eq` filter. | [Official] |
| A client without verified payment, a low budget, requests to leave the platform, suspicious questions, and a low rate with a large project = high-risk patterns. | [Reasonable inference from community experience; not officially confirmed] |
| Duration and hours in Hourly must match the Work diary/contract settings. | [Official — Work diary concept documentation] |

### A8. Terms and automation risk (most important section)
| Finding | Source | Level |
|---|---|---|
| **Upwork MCP (official):** an AI agent can **draft** a proposal; submissions (proposals/messages) **require your approval**. Connects are consumed as on the website. "An API key is required for high-volume automated flows." | [upwork.com/ai/mcp](https://www.upwork.com/ai/mcp) (2026-08) | **[Official]** |
| Under MCP/API terms, an agent must not automatically bypass human approval (sections 5.2 and 4.1 in the uphunt analysis; the full text was not available). | uphunt.io (2026-09) | [Single source / analysis] |
| The older Terms of Use (version 4.12, section 3.5) prohibit a "robot, spider, scraper … without written permission" and access through technology other than the official interface. | GigRadar (quoting the older version) | [Single source / old] — **the current version must be checked** |
| User Agreement version 8.2 (effective 20 July 2026) and Terms of Service version 7.3 (28 July 2025) | [Legal Center](https://www.upwork.com/legal) | **[Official]** (dates) |
| A User must be a single person; account sharing is not allowed. | [API Documentation](https://www.upwork.com/developer/documentation/graphql/api/docs/index.html) | **[Official]** |
| Scraping site pages, auto-submit bots, and browser extensions that refresh/submit = high ban risk | Several vendor sources and Reddit | [Multiple sources / user experience] |

**ToS conclusion (clear):**
- **Agent allowed:** reading Upwork emails (Job Alerts and messages) from a personal inbox, extracting, scoring, drafting proposals, sending to Telegram.
- **Human:** opening the job on Upwork, reviewing, copying and **submitting manually**.
- **Prohibited/high-risk:** scraping job pages, automatic proposal submission, agent login to your account, automatic messaging to clients, creating multiple accounts.

### A9. Upwork API and email
| Finding | Source | Level |
|---|---|---|
| Official GraphQL API at `https://api.upwork.com/graphql` with OAuth 2.0 | [API Docs](https://www.upwork.com/developer/documentation/graphql/api/docs/index.html) | **[Official]** |
| API key requirements: valid name, address, photo, verified payment, ID verification, **≥ $25,000 cumulative earnings/spend**, **JSS ≥ 90%**, account not suspended; and a **40,000 requests/day** limit. | Same | **[Official]** |
| `marketplaceJobPostingsSearch` with many filters (`searchExpression`, `budgetRange`, `daysPosted`, `verifiedPaymentOnly`, `clientFeedBackRange`, `locations`, …) for public search. | Same | **[Official]** |
| ⚠️ **Conflict:** GigRadar claims the official API has no mutation to submit a proposal. **This contradicts the official documentation (`createJobProposal`).** | GigRadar (2026-08) vs official docs | **[Official wins]** |
| But: using `createJobProposal` in practice requires permission and key approval (conditions above), and under the ToS it must be "human-confirmed". | Inference from the conditions + MCP | Inference |
| Job Alert email (official settings): Basic: up to 30 Saved Searches with email/feed. Freelancer Plus: Instant Job Alerts (email or app). | [Upwork Help: email notification settings](https://support.upwork.com/hc/en-us/articles/211067708-How-to-change-your-Upwork-email-and-notification-settings) and third-party sources | [Official] for Messages; the rest [Multiple sources] |
| Default email frequency for messages: 15 minutes (official). | Same | **[Official]** |
| Job Alert email content: title, part of the description, budget and link. Fields such as client spend history, hire rate, proposal count, skill tags and Connects are usually **not in the email**. | tryvibeworker.com (2026-10) and upworkalerts.com (2026-05) | [Single source / multiple third parties] — **must be confirmed with your real email** |
| "Instant" alert emails are batched and may arrive 15 minutes to several hours late. | Third party | [Single source] |

---

## Part B — What makes a good agent?

### B1. Existing tools (general analysis)
| Tool/category | Strength | Weakness | Source |
|---|---|---|---|
| Commercial tools (GigRadar, Vollna, UpHunt, …) | Scanner, scoring and drafting | Generic proposals and a uniform template; ToS ambiguity in some auto-bid tools | Websites (vendor) [Single source / promotional] |
| Uma (built into Upwork) | Drafts in place | Generic; similar for everyone; changes quickly | [Official] 2024 news |
| Auto-submit tools | Speed | Ban | [Multiple sources / user experience] |

**Why generic proposals are weak:** a simple prompt (no profile or real examples), no connection to the job, and a fixed structure. (Inference)

### B2. Design principles
| Principle | Description | Level |
|---|---|---|
| Grounding | Only facts from your profile/portfolio; every claim tied to a source; an unknown claim becomes a placeholder | Strong inference |
| Human-in-the-loop | Only you submit; the agent only drafts | [Official: MCP] |
| Hallucination reduction | JSON Schema, Pydantic validation, claim checking against the profile list | Inference |
| Variety | Avoid a repeating pattern; the first sentence depends on the job | [Multiple sources] |
| Automated evaluation | LLM-as-judge + a rules checklist (length, clichés, closing question) | Inference |

### B3. Few-shot / RAG / feedback
- **MVP:** fixed few-shot examples (2–3 good examples from you) + a profile defined in YAML.
- **Phase 2:** store approved proposals and outcomes (reply/interview/contract) in SQLite; pick top-k similar examples with a simple embedding or TF-IDF.
- **Feedback:** Telegram buttons/commands: approve / edit / reject / applied / replied / hired.
- **Evaluation:** compare your final text with the draft (edit distance); if it decreases, the prompt is better.

### B4. Evaluation metrics
| Metric | Definition | Initial target (suggested) |
|---|---|---|
| Extraction accuracy | Percentage of correct fields across 50 labelled emails | ≥ 90% for title/budget/link |
| Precision of "apply" | Of the suggested jobs, what percentage you actually wanted | ≥ 60% |
| Edit rate | Percentage of proposals edited by more than 30% | Decreasing month over month |
| Reply rate / Interview rate | Of submitted proposals | Against your own baseline; measure for the first 4 weeks |
| Cost per reply | (Connects × price) ÷ replies | Record it |

---

## Summary of conflicts (for quick reference)

1. Connects per proposal: 2–16 (third party) ↔ "varies, shown in the job post" (official) → collect from real job posts.
2. Connect price ($0.15): third party ↔ not confirmed officially.
3. Freelancer Plus: $14.99 ↔ $19.99; 80 ↔ 100 Connects.
4. API proposal mutation: GigRadar "does not exist" ↔ **officially it does** (`createJobProposal`, restricted permission).
5. AI disclosure: a claimed "always disclose" guide ↔ terms "prohibited if the client forbids it" (combining both = transparency + originality).
6. Uma Recruiter shortlisting on Basic: third party ↔ not officially confirmed.
