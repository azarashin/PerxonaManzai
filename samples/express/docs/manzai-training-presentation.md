---
marp: true
theme: default
paginate: true
size: 16:9
header: "Perxona Manzai Training MVP"
footer: "1-minute deck + appendix"
style: |
  section {
    font-family: "Noto Sans", "Noto Sans JP", "Yu Gothic UI", sans-serif;
    padding: 48px 64px;
    color: #251d32;
    background: linear-gradient(145deg, #fffdf8 0%, #f6f0ff 100%);
  }
  section.lead {
    color: #fff9ee;
    background: radial-gradient(circle at 15% 15%, #583566 0%, transparent 42%), #100c19;
  }
  section.lead h1, section.lead h2 { color: #ffcb45; }
  section.appendix {
    color: #fff9ee;
    background: #281d36;
  }
  section.appendix h1, section.appendix h2 { color: #ffcb45; }
  h1 { color: #5b2d82; font-size: 2.15em; }
  h2 { color: #6a3a91; }
  strong { color: #6a3a91; }
  code { background: #ede4f5; color: #43205e; }
  pre { border-radius: 12px; background: #1c1629; }
  table { font-size: 0.72em; }
  th { background: #5b2d82; color: white; }
  blockquote {
    margin: 0.35em 0 0.75em;
    padding: 0;
    border: 0;
    color: #74687e;
    background: transparent;
    font-size: 0.62em;
    line-height: 1.45;
  }
  section.lead blockquote, section.appendix blockquote { color: #cfc4d7; }
  header, footer { color: #766b82; font-size: 0.55em; }
  section.lead header, section.lead footer, section.appendix header, section.appendix footer { color: #c7bcd0; }
  .small { font-size: 0.72em; }
---

<!-- _class: lead -->

# Perxona Manzai Training

> Perxona 漫才トレーニング

## Practice spoken comedy with an AI avatar

> AIアバターをボケ役にした、音声ツッコミ練習環境

**Perxona Connect Kit × Browser Speech Recognition**

---

# The Challenge

> 解決したい課題

Comedy practice needs a partner, repetition, and immediate feedback.

> 漫才練習には、相方・反復・すぐに得られる評価が必要です。

**Our MVP provides all three with one browser experience.**

> 本MVPは、この3つをブラウザーだけで提供します。

---

# One Simple Training Loop

> シンプルなトレーニング体験

```text
Avatar performs a joke
        ↓
User speaks one comeback
        ↓
Recognition + scoring
        ↓ 2 sec
Next joke
```

> アバターのボケ → ユーザーが発声 → 音声認識・採点 → 2秒後に次のボケ

---

# How It Works

> システム構成

```text
Browser
  UI + Scenario + Reaction + Scoring
  SpeechRecognition ↔ <sv-presenter>
        │                    │
        ▼                    ▼
Chrome Speech        Express / Perxona API
```

Three synchronized languages: **English / Traditional Chinese / Japanese**

> 画面表示・キャラクター発話・音声認識を、英語・繁体中国語・日本語で連動します。

---

# Immediate, Explainable Feedback

> 即時かつ説明可能なフィードバック

**100 points = Content 80 + Timing 20**

- Deterministic scenario-based scoring
- Fuzzy matching tolerates recognition differences
- No LLM required for the MVP

> 100点＝内容80点＋タイミング20点。台本に基づく決定論的な採点で、認識の表記揺れも吸収します。

## A repeatable comedy partner, available anytime.

> いつでも繰り返し練習できる「相方」を実現しました。

---

<!-- _class: appendix -->

# Appendix

> 補足資料

## Technical details, constraints, and roadmap

> 技術詳細・制約・今後の拡張

---

# Technology Stack

> 技術スタック

| Layer | Technology | Responsibility |
|---|---|---|
| UI | HTML / CSS / Vanilla ESM | Training screen and multilingual display |
| Avatar | Perxona `<sv-presenter>` | 3D avatar, TTS, motion |
| Recognition | Web Speech API | Microphone-to-text |
| Backend | Node.js 22 / Express 4 | Auth, token, catalog proxy |
| Data | JSON | Script, translations, scores |

> ビルド工程のない軽量な構成で、台本はJSONとしてコードから分離しています。

---

# Runtime Architecture

> 実行時アーキテクチャ

```text
┌────────────── Chrome / Edge ──────────────┐
│ UI ─ ScenarioController ─ Evaluator       │
│  └─ SpeechRecognizer   └─ <sv-presenter>  │
└──────────┬─────────────────────┬───────────┘
           │                     │
   Chrome recognition        Express server
                                 │
                      Perxona API / Presenter CDN
```

> ブラウザーが画面・進行・認識・採点を担当し、ExpressはPerxona認証とカタログ取得を仲介します。

---

# State Machine

> 状態遷移

```text
SETUP → READY → BOKE_SPEAKING
                    │ playback finished
                    ▼
                ANSWERING
             retry │ │ matched
                   └─┤
                     ▼
                  FEEDBACK
                     │ 2 sec
                     ▼
              NEXT / COMPLETE
```

> 再挑戦・手動進行・言語変更時は予約タイマーを解除し、二重進行を防ぎます。

---

# Perxona Integration

> Perxona連携

1. Express logs in with server-side Connect credentials.
2. Browser requests a short-lived token from `/api/connect-token`.
3. Presenter initializes with `avatarId`, `sceneId`, and `voiceId`.
4. Reaction tags resolve to a verified Avatar Motion ID.
5. `present()` performs the localized boke with Motion Markup.
6. `ALL_PERFORMANCE_FINISHED` opens the microphone window.

> Expressが認証を担当し、台本のリアクションタグを実在するMotion IDへ解決して再生します。発話完了後だけマイクを開始します。

---

# Language Synchronization

> 言語連動

| Selection | Boke text | Voice filter | Recognition |
|---|---|---|---|
| English | `boke.en` | `en` | `en-US` |
| 中文（繁體） | `boke.zh` | `zh` | `zh-TW` |
| 日本語 | `boke.ja` | `ja` | `ja-JP` |

Controls, guidance, errors, and feedback switch to the selected language. Scenario translations remain visible together.

> 操作説明・エラー・講評は選択言語へ切り替え、シナリオの翻訳は3言語同時に表示します。

---

# Scenario Model

> シナリオデータ

```json
{
  "boke": { "ja": "...", "en": "...", "zh": "..." },
  "reaction": {
    "motionTags": ["pose:showcase_02", "category:talking"],
    "cue": "start", "priority": 1
  },
  "choices": [{
    "text": { "ja": "...", "en": "...", "zh": "..." },
    "contentPoints": 80,
    "feedback": { "ja": "...", "en": "...", "zh": "..." }
  }]
}
```

Writers can update lines, reactions, translations, and scores without changing application code.

> 台本担当者はアプリのコードを変更せず、セリフ・リアクション・翻訳・配点を編集できます。

---

# Recognition and Matching

> 音声認識と照合

```text
Final transcript
  → Unicode NFKC normalization
  → lowercase + punctuation removal
  → Japanese kana normalization
  → similarity against choices and aliases
```

Responses below similarity `0.48` are not scored and can be retried.

> 類似度0.48未満は採点せず、ユーザーへ再回答を促します。

---

# Scoring Details

> 採点詳細

| Reaction time | Timing score |
|---:|---:|
| ≤ 1.0 sec | 20 |
| ≤ 2.0 sec | 18 |
| ≤ 3.0 sec | 15 |
| ≤ 4.5 sec | 10 |
| ≤ 6.0 sec | 6 |
| > 6.0 sec | 2 |

Content points are authored per choice and capped at 80.

> 内容点は選択肢ごとに台本で定義し、最大80点です。

---

# Safety and Failure Handling

> 誤動作・障害への対策

| Risk | Mitigation |
|---|---|
| Avatar voice recognized as user | Start recognition only after playback |
| Expired token | Refresh on Presenter event |
| Double navigation | State guard + timer cleanup |
| Wrong-language voice | Filter by catalog metadata |
| Invalid Motion ID | Resolve tags against live Avatar catalog |
| Credential leak | Keep `.env` outside Git |

> 音声ファイルはアプリに保存しませんが、Chromeの認識処理で外部サービスへ送信される可能性があります。

---

# MVP Limits and Next Steps

> 現在の制約と次のステップ

**Current limits**

- Browser-dependent speech recognition
- No volume, pitch, or speaking-speed score
- In-memory progress and one bundled scenario
- Shared Connect identity for demo use

**Next:** delivery-quality analysis, scenario management, learning history, production auth.

> 今後は発声品質評価、シナリオ管理、学習履歴、本番用認証へ拡張します。

---

# Demo Checklist

> デモ手順

1. Run `npm run dev`.
2. Open `/demos/manzai-training/` in Chrome.
3. Select language, Avatar, Scene, and Voice.
4. Prepare the avatar and start training.
5. Speak a displayed comeback.
6. Show scoring and two-second auto advance.

> 事前にChromeの既定マイク、サイト権限、Perxona API接続を確認してください。
