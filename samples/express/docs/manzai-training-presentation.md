---
marp: true
theme: default
paginate: true
size: 16:9
header: "Perxona Manzai Training MVP"
footer: "2-minute overview"
style: |
  section {
    font-family: "Noto Sans", "Segoe UI", sans-serif;
    padding: 48px 64px;
    color: #251d32;
    background: linear-gradient(145deg, #fffdf8 0%, #f6f0ff 100%);
  }
  section.lead {
    color: #fff9ee;
    background: radial-gradient(circle at 15% 15%, #583566 0%, transparent 42%), #100c19;
  }
  section.lead h1, section.lead h2 { color: #ffcb45; }
  h1 { color: #5b2d82; font-size: 2.15em; }
  h2 { color: #6a3a91; }
  strong { color: #6a3a91; }
  code { background: #ede4f5; color: #43205e; }
  pre { border-radius: 12px; background: #1c1629; }
  table { font-size: 0.82em; }
  th { color: white; background: #5b2d82; }
  header, footer { color: #766b82; font-size: 0.55em; }
  section.lead header, section.lead footer { color: #c7bcd0; }
---

<!-- _class: lead -->

# Perxona Manzai Training

## Practice spoken comedy with an AI boke partner

### Speak. Score. Repeat.

**Perxona Connect Kit × Browser Speech Recognition**

<!--
0:00–0:15

This is Perxona Manzai Training. A Perxona avatar becomes the boke partner, while the learner practices delivering quick spoken comebacks.
-->

---

# Avatar Experience and Product Value

| Avatar experience | Use case and product value |
|---|---|
| An AI boke partner | On-demand spoken comedy training |
| Voice, dialogue, and reactions | Repeatable scenarios with measurable progress |
| Interactive character practice | Reusable for other role-play training |

**From avatar playback to an interactive training product.**

<!--
0:15–0:38

The avatar performs the boke with voice and reactions, creating an engaging partner experience. For users, this enables repeatable speaking practice. For the product, reusable scenarios and explainable scoring create scalable training value.
-->

---

# One Simple Training Loop

```text
Avatar delivers a scripted joke + reaction
                    ↓
User speaks one displayed comeback
                    ↓
Speech recognition + explainable scoring
                    ↓ 5 seconds
Next joke
```

Available in **English, Traditional Chinese, and Japanese**.

<!--
0:38–1:02

The avatar delivers a scripted joke with a matching reaction. The learner speaks one displayed comeback, and browser speech recognition identifies it. The score stays visible for five seconds before the next joke. This loop supports three languages.
-->

---

# How It Works

```text
                  Scenario JSON
                       ↓
Browser: UI + State + Reaction + Evaluation
          ↙                         ↘
 <sv-presenter>              Web Speech API
          ↓                         ↓
  Perxona Connect             Recognized text
```

**One language selection synchronizes UI, voice, recognition, and scoring.**

<!--
1:02–1:32

Scenario JSON defines the dialogue, reactions, choices, and scores. The browser sends the selected line and a verified motion to Perxona Presenter. The Web Speech API recognizes the learner's response. One language selection synchronizes the interface, avatar voice, recognition, and scoring.
-->

---

# Immediate, Explainable Results

## 100 points = Content 80 + Timing 20

- Scenario-authored reactions and deterministic feedback
- Fuzzy matching tolerates recognition differences
- Detailed per-question results at completion

## A repeatable comedy partner, available anytime.

<!--
1:32–1:55

Each response receives up to eighty points for content and twenty for timing. Fuzzy matching handles small recognition differences, and the final report explains every result. This creates a repeatable comedy partner that is available anytime.
-->
