---
marp: true
theme: default
paginate: true
size: 16:9
header: "Perxona Manzai Training MVP"
footer: "Technical appendix"
style: |
  section {
    font-family: "Noto Sans", "Segoe UI", sans-serif;
    padding: 48px 64px;
    color: #251d32;
    background: linear-gradient(145deg, #fffdf8 0%, #f6f0ff 100%);
  }
  section.lead {
    color: #fff9ee;
    background: #281d36;
  }
  section.lead h1, section.lead h2 { color: #ffcb45; }
  h1 { color: #5b2d82; font-size: 2.05em; }
  h2 { color: #6a3a91; }
  strong { color: #6a3a91; }
  code { background: #ede4f5; color: #43205e; }
  pre { border-radius: 12px; background: #1c1629; }
  table { font-size: 0.72em; }
  th { color: white; background: #5b2d82; }
  header, footer { color: #766b82; font-size: 0.55em; }
  section.lead header, section.lead footer { color: #c7bcd0; }
---

<!-- _class: lead -->

# Technical Appendix

## Perxona Manzai Training MVP

Architecture, data model, scoring, and constraints

---

# Technology and Runtime

| Layer | Technology | Responsibility |
|---|---|---|
| UI | HTML / CSS / Vanilla ESM | Training screen and multilingual content |
| Avatar | Perxona `<sv-presenter>` | 3D avatar, TTS, and motion |
| Recognition | Web Speech API | Microphone-to-text |
| Backend | Node.js 22 / Express 4 | Auth, token, and catalog proxy |
| Data | JSON | Script, translations, reactions, and scores |

```text
Chrome / Edge → Express → Perxona API
      └──────── Presenter CDN ────────┘
```

---

# State and Timing

```text
SETUP → READY → BOKE_SPEAKING
                    │ playback finished
                    ▼
                ANSWERING
             retry │ │ matched
                   └─┤
                     ▼
                  FEEDBACK
                     │ 5 sec
                     ▼
              NEXT / COMPLETE
```

State guards and timer cleanup prevent duplicate navigation.

---

# Perxona and Reactions

1. Express authenticates with server-side Connect credentials.
2. The browser requests a short-lived Connect token.
3. Presenter initializes with the selected Avatar, Scene, and Voice.
4. Scenario reaction tags resolve against the live Avatar motion catalog.
5. A verified Motion ID is embedded as `[MOTION id:1]`.
6. `ALL_PERFORMANCE_FINISHED` opens the microphone window.

Unmatched reactions safely fall back to the Presenter's automatic gesture.

---

# Language Synchronization

| Selection | Spoken line | Voice filter | Recognition | UI |
|---|---|---|---|---|
| English | `boke.en` | `en` | `en-US` | English |
| Traditional Chinese | `boke.zh` | `zh` | `zh-TW` | Traditional Chinese |
| Japanese | `boke.ja` | `ja` | `ja-JP` | Japanese |

Scenario titles, jokes, and comeback choices remain visible in all three languages.

---

# Scenario Model

```json
{
  "evaluationAxes": [{
    "id": "premise-recognition",
    "label": { "ja": "ボケの把握", "en": "Premise recognition", "zh": "理解笑點" },
    "description": { "ja": "矛盾を捉える", "en": "Identify the contradiction.", "zh": "找出矛盾。" },
    "maxPoints": 80
  }],
  "boke": { "ja": "...", "en": "...", "zh": "..." },
  "reaction": {
    "motionTags": ["pose:showcase_02", "category:talking"],
    "cue": "start",
    "priority": 1
  },
  "choices": [{
    "text": { "ja": "...", "en": "...", "zh": "..." },
    "axisScores": { "premise-recognition": 80 },
    "feedback": { "ja": "...", "en": "...", "zh": "..." }
  }]
}
```

Writers can update dialogue, reactions, translations, and scores without changing application code.

---

# Recognition and Scoring

```text
Final transcript
  → Unicode NFKC normalization
  → lowercase + punctuation removal
  → Japanese kana normalization
  → similarity against choices and aliases
```

| Reaction time | Timing score |
|---:|---:|
| ≤ 1.0 sec | 20 |
| ≤ 2.0 sec | 18 |
| ≤ 3.0 sec | 15 |
| ≤ 4.5 sec | 10 |
| ≤ 6.0 sec | 6 |
| > 6.0 sec | 2 |

Similarity below `0.48` triggers a retry instead of a score.

---

# Detailed Results and Safety

**Completion report per question**

- Recognized speech and matched comeback
- Content score, timing score, response time, and similarity
- Scenario-authored feedback

**Safety controls**

- Recognition starts only after avatar playback finishes.
- Motion IDs are verified against the selected Avatar catalog.
- Credentials remain server-side in an ignored `.env` file.
- The app does not store audio recordings.

---

# Current Limits and Roadmap

**Current limits**

- Browser-dependent speech recognition
- No volume, pitch, or speaking-speed analysis
- In-memory progress and one bundled scenario
- Shared Connect identity for demo use

**Next:** delivery-quality analysis, scenario management, learning history, and production authentication.
