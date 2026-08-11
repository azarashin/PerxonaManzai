# Scenario Category Expansion Strategy

English | [日本語](category-expansion-strategy.ja.md)

## 1. Purpose

This document defines the criteria and implementation order for adding conversation categories to scenario training. Categories should not be added solely to increase content volume. Each candidate must first be evaluated for compatibility with the scoring model, data-model requirements, safety, and content quality.

See the [scenario generation guide](scenario-generation-guide.md) for the JSON authoring workflow. This document covers category structure and product policy rather than individual file creation.

## 2. Application characteristics

The original training flow used a linear model:

1. The Avatar delivers a predefined line.
2. The player responds by voice or click.
3. The response is matched against authored choices.
4. Authored content points and response timing are combined.
5. Training advances to the next fixed dialogue.

This works well for practicing a short, context-appropriate reply. The application now also supports multiple evaluation axes, persistent scenario state, state effects, and conditional routes. Categories should therefore be designed at the simplest level that preserves their learning value: linear, multi-axis, or stateful and branching.

## 3. Compatibility criteria

| Rating | Criteria |
| --- | --- |
| Very high | Short lines, authored choices, authored scoring, response timing, and Avatar motion express the main learning value |
| High | Beginner scenarios work linearly, while intermediate or advanced scenarios benefit from multiple axes or light state |
| Moderate | An introduction can use authored choices, but the category's core game mechanics require branching or persistent state |
| Introduce cautiously | Safety, professional accuracy, or ethical review is mandatory regardless of technical fit |

Evaluate each category against these questions:

- Does a short speech-recognition response feel natural?
- Is response timing meaningful?
- Can choices have clear, educational differences?
- Do Avatar expressions and motion improve the exercise?
- Would one fixed “best” answer feel artificial?
- Can the exercise work without conversation history or hidden state?
- Could incorrect content cause real-world harm?

## 4. Existing categories

### 4.1 Customer service and complaint handling

Keep the `customer-service` ID for compatibility with URLs, local progress, and direct links, while expanding its displayed and authored scope to customer service and complaint handling.

New scenarios should follow these principles:

- Do not immediately accept every customer claim as fact.
- Acknowledge emotion and inconvenience before correcting facts.
- Do not admit fault or compensation obligations beyond known authority.
- Balance empathy, fact checking, and alternatives.
- Include escalation or authorization checks for refunds, safety, allergies, and payments.

Representative topics include delayed food, refund demands, and complaints about staff attitude.

### 4.2 Manzai and comebacks

Keep the `manzai` ID and reinforce its evaluation policy:

- Score whether the response catches a contradiction, exaggeration, or broken premise.
- Consider brevity, word choice, and timing as well as semantic correctness.
- Make active use of speech recognition and motion.
- Keep premise recognition, clarity, and word choice as explainable evaluation axes.

## 5. Category compatibility assessment

| Candidate category | Recommended ID | Fit | Scope supported by the current model | Main extension or caution |
| --- | --- | --- | --- | --- |
| Customer service and complaints | `customer-service` | Very high | Empathy, verification, explanation, alternatives | Integrate with the existing category; avoid excessive admission of liability |
| Romantic, marital, and partner conversations | `partner-communication` | High | Short exercises choosing empathy or problem solving | Past statements and anniversaries require memory |
| Manager and employee conversations | `workplace-communication` | Very high | Coaching, reporting, tactful disagreement | State roles, authority, and psychological safety |
| Negotiation, bargaining, and sales | `negotiation-sales` | High | Questions, offers, and basic concessions | Track value, trust, and remaining concessions |
| Apology and incident response | `apology-response` | Very high | Ordering explanation, apology, prevention, and compensation | Do not assert unverified responsibility or compensation |
| Manzai and comebacks | `manzai` | Very high | Already supported | Extend the existing category |
| Interviews and hiring | `interview-hiring` | High | Motivation, weaknesses, candidate questions | Avoid rote model answers and discriminatory evaluation |
| Investigative interviewing | `investigative-interview` | Moderate | Question order and calm contradiction checks | Do not reward coercion; track contradictions and trust |
| Clinical communication | `clinical-communication` | High, cautious | Listening, checking, plain explanations, referral | Do not train diagnosis or treatment; require expert review |
| Teacher and student conversations | `teacher-student` | High | Correction, encouragement, and receiving concerns | State relevant personality and context; avoid assumptions |
| Advice between friends | `friend-advice` | Very high | Empathy, questions, timing of advice | Good for short scenarios; serious issues may require referral |
| Parent and child conversations | `parent-child` | High | Defiance, game time, and education choices | Long-term trust and promises require state |
| Diplomatic and political negotiation | `diplomatic-negotiation` | Moderate | Face-saving language and conditional agreement | Multiple interests and ongoing relationships require branching |
| Scam awareness | `scam-awareness` | High | Questions, delay, refusal, and protecting personal data | Do not label real organizations fraudulent without evidence |
| Hostage and crisis negotiation | `crisis-negotiation` | Moderate, cautious | Non-escalating initial responses | Requires tension state, branching, expert review, and warnings |

## 6. Recommended rollout

### Phase 1: Add baseline scenarios using the linear model

Start with categories whose learning value can be expressed through authored choices and scoring:

1. Customer service and complaints
2. Advice between friends
3. Manager and employee conversations
4. Apology and incident response
5. Interviews and hiring
6. Teacher and student conversations
7. Scam awareness
8. Partner communication

Add one three-to-four-dialogue baseline scenario per category before adding volume. Verify the category name, objectives, meaningful choice differences, scoring rationale, and translation quality first.

### Phase 2: Use multiple evaluation axes

A single aggregate content score cannot explain the strengths and weaknesses of complex responses. Use scenario-specific axes whose maximums total 80.

| Suggested axis | Purpose |
| --- | --- |
| `empathy` | Acknowledges emotion or inconvenience appropriately |
| `fact-checking` | Avoids unsupported claims and performs necessary checks |
| `clarity` | Uses concise and understandable language |
| `solution-quality` | Offers an actionable alternative or next step |
| `boundary-keeping` | Avoids promises beyond authority or excessive responsibility |
| `relationship-impact` | Protects trust and the continuing relationship |

Priority categories are customer service, negotiation and sales, parent-child conversations, and partner communication.

### Phase 3: Use state and branching

Maintain state across dialogues and update it through choices. Useful state includes:

- `trust`: relationship trust
- `tension`: emotional tension
- `cooperation`: willingness to collaborate
- `concession-budget`: remaining room to concede
- `known-facts`: verified facts
- `contradictions`: contradictions already identified
- `commitments`: previously offered terms or promises

Each choice may update state and route to another beat after evaluating state conditions. This phase enables investigative interviews, diplomacy, crisis negotiation, advanced sales negotiation, and longer parent-child or partner conversations.

### Phase 4: Introduce high-risk categories under restrictions

Limit medicine, investigative interviewing, and crisis negotiation to general communication skills. Confirm professional accuracy and safety before publication. Never encourage users to apply application output directly in a real emergency.

## 7. Initial baseline scenarios

| Priority | Category | Candidate scenario ID | Learning objective |
| ---: | --- | --- | --- |
| 1 | Customer service and complaints | `delayed-order-complaint` | Acknowledge inconvenience, verify status, and offer a realistic alternative |
| 2 | Advice between friends | `considering-resignation` | Ask whether the person wants empathy or solutions before advising |
| 3 | Manager and employee conversations | `unrealistic-deadline` | Explore evidence, priorities, and adjustment options without dismissing the concern |
| 4 | Apology and incident response | `service-outage-apology` | Organize facts, acknowledge impact, explain current action, and schedule the next update |
| 5 | Scam awareness | `suspicious-investment-call` | Protect personal data, verify claims, pause, and end the conversation safely |

## 8. Shared authoring principles

- Provide two to four clearly distinct choices per dialogue.
- Explain the difference between best, partly effective, and dangerous or counterproductive responses.
- Score the purpose and effect of a line, not only politeness.
- Do not make apology, agreement, or forceful rebuttal universally optimal.
- State player role, counterpart role, known facts, and authority limits.
- Keep responses short and lexically distinct enough for speech recognition.
- Translate for equivalent conversational effect rather than word-for-word similarity.
- Make feedback reusable in the learner's next conversation.
- Do not generalize laws, medical judgments, refund rules, or other unstable facts without verification.

## 9. Safety and review

### Shared rules

- Never reward discrimination, intimidation, deception, or excessive collection of personal information.
- Treat interpretations of emotion as hypotheses, not facts.
- Do not resolve crime, abuse, self-harm, or medical emergencies using conversation technique alone.
- Do not make unsupported accusations against real people, companies, or products.

### Clinical communication

- Do not teach diagnosis or individualized treatment as the correct answer.
- Focus on listening, information checks, plain explanations, appropriate care, and professional handoff.
- Avoid both dismissing symptoms and unnecessarily increasing fear.

### Investigative interviewing

- Do not recommend forced confessions, threats, sleep deprivation, or fabricated evidence.
- Frame the category as fact-finding `investigative-interview`, not coercive interrogation.
- Limit contradiction checks to statements that can actually be verified.

### Crisis negotiation

- Do not present the content as a guaranteed real-world procedure.
- Limit it to emotional stabilization, listening, gaining time, and involving professionals.
- Review audience and age restrictions separately.

## 10. Implementation gate

Add a category or scenario only when all applicable conditions are met:

- Its ID is unique and the content should not be merged into an existing category.
- Its learning objective and audience can be explained in one to three sentences.
- Score differences between choices have a consistent rationale.
- A scenario that requires branching is not forced into a linear structure.
- Japanese, English, and Traditional Chinese preserve the same conversational intent.
- Preview reveals no unnatural choices, scores, or reactions.
- `npm run validate:scenarios` and `npm test` succeed.
- Required safety review is complete for high-risk content.

## 11. Success measures

Do not evaluate expansion only by scenario count. Monitor:

- Starts and completions per scenario
- Retry and review usage
- Choice distribution
- Choices that are universally selected, suggesting ineffective difficulty
- Speech-recognition confusion between choices
- Average response time per category
- Scoring meaning across translations
- Reports of unsafe or inappropriate model answers

The current privacy policy keeps progress on the user's device and does not send usage history to the server. Any future analytics must be designed separately, with collection fields, purpose, retention, and consent defined in advance.

## 12. Current decisions

1. Do not change the `customer-service` or `manzai` IDs.
2. Introduce categories incrementally through baseline scenarios.
3. Do not create one schema per category; extend the shared model only when the data model changes.
4. Use multiple evaluation axes where one score cannot explain performance.
5. Use state and branching before adding large amounts of content whose learning value depends on consequences.
6. Add medicine, investigative interviewing, and crisis negotiation only after safety and review procedures are ready.

## 13. Branching guidance in `index.json`

Every category must include authoring guidance:

```json
{
  "branching": {
    "requirement": "recommended",
    "rationale": {
      "ja": "分岐を推奨する理由",
      "en": "Why branching is recommended",
      "zh": "建議使用分支的原因"
    }
  }
}
```

| Value | Authoring behavior |
| --- | --- |
| `not-required` | A linear scenario can express the category's main learning value |
| `recommended` | Beginner content may be linear; prefer branching at higher levels when reactions or verification results matter |
| `required` | The category's core learning value requires branching; do not generate a linear substitute |

The rationale describes the category in general, not one scenario plot. Read this value before authoring. If a `recommended` category is implemented linearly, document the reason in the work result.
