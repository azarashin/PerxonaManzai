# シナリオJSONスキーマ解説

[English](json-schema-reference.md) | 日本語

## 1. 目的

対話道場では、カテゴリとシナリオ一覧を管理するカタログ、および各シナリオの内容をJSONで管理する。
JSON Schemaと追加検証によって、シナリオを追加する前に構造、翻訳、配点、参照先を検査できる。

| 対象 | スキーマ | データ |
| --- | --- | --- |
| カテゴリとシナリオ一覧 | [`scenario-catalog.schema.json`](../schemas/scenario-catalog.schema.json) | [`index.json`](../scenarios/index.json) |
| シナリオ本体 | [`scenario.schema.json`](../schemas/scenario.schema.json) | `scenarios/*.json` |
| 品質ポリシー | [`scenario-quality-policy.schema.json`](../schemas/scenario-quality-policy.schema.json) | [`scenario-quality-policy.json`](../config/scenario-quality-policy.json) |

どちらもJSON Schema Draft 2020-12を使用し、未定義のプロパティを許可しない。

## 2. 共通ルール

### ID

カテゴリ、シナリオ、評価軸、状態変数、対話、選択肢には、小文字のケバブケースを使用する。

```text
partner-communication
relationship-impact
confirm-next-steps
```

IDは表示名ではなく永続的な参照キーである。公開後は、進捗データや分岐参照との互換性を保つため、表示名だけを変更しIDは変更しない。

### 多言語テキスト

`localizedText`は日本語、英語、繁体字中国語をすべて必須とする。

```json
{
  "ja": "信頼",
  "en": "Trust",
  "zh": "信任"
}
```

空文字や空白だけの値は使用できない。

### 発音ガイド

`pronunciationGuide`は、キャラクター発話またはプレイヤーの選択肢へ付与できる任意の表示専用メタデータである。
指定する場合は三言語をすべて含め、文全体を次の表記で記述する。

- `ja`: ひらがなによる全文の読み
- `en`: `/`で囲んだ一般米語の広いIPA表記
- `zh`: 声調記号付きの漢語拼音（Hanyu Pinyin）

各値はUnicode NFC形式で保存する。発音ガイドは、原文表示、音声認識用フレーズ、alias、採点、講評には影響しない。
読みを確信できない場合は推測せず、このフィールドを省略する。

```json
"pronunciationGuide": {
  "ja": "こんびにに れいぞうこ うってへんわ！",
  "en": "/kənˈviːniəns stɔrz doʊnt sɛl rɪˈfrɪdʒəˌreɪtərz/",
  "zh": "Biànlì shāngdiàn cái bú huì mài bīngxiāng lie!"
}
```

## 3. シナリオカタログ

カタログのトップレベルは`categories`と`scenarios`で構成する。

### categories

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` | 必須 | カテゴリID |
| `title` | 必須 | 多言語のカテゴリ名 |
| `branching.requirement` | 必須 | `not-required`、`recommended`、`required`のいずれか |
| `branching.rationale` | 必須 | 分岐要否の多言語説明 |

`branching`はシナリオ生成時の設計指針である。`required`のカテゴリでは状態・分岐モデルを使い、
`recommended`では難易度や会話の因果関係に応じて採用する。

### scenarios

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` | 必須 | シナリオ本体の`id`と一致させる |
| `categoryId` | 必須 | 登録済みカテゴリのID |
| `beatCount` | 必須 | シナリオ本体の`beats.length`と一致する正整数 |
| `difficulty` | 必須 | `beginner`、`intermediate`、`advanced`のいずれか |
| `estimatedMinutes` | 必須 | 想定所要時間（分）の正整数 |
| `learningObjectives` | 必須 | 各言語で1件以上の学習目標 |
| `title` | 必須 | シナリオ本体の`title`と一致させる |
| `path` | 必須 | `./scenarios/<scenario-id>.json`形式のパス |

カテゴリ内のシナリオは、画面上で`beatCount`の少ない順に並ぶ。

## 4. シナリオ本体

### トップレベル

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `$schema` | 任意 | 通常は`../schemas/scenario.schema.json` |
| `id` | 必須 | シナリオID |
| `title` | 必須 | 多言語タイトル |
| `description` | 必須 | 多言語の概要 |
| `evaluationAxes` | 必須 | 内容評価の軸。上限点の合計を80にする |
| `beats` | 必須 | 1件以上の対話ノード |
| `startBeatId` | 任意 | 最初の対話ID。省略時は`beats`の先頭 |
| `stateVariables` | 任意 | 分岐に使う状態変数 |

`startBeatId`、`stateVariables`、選択肢の`stateEffects`と`routes`を省略すると、`beats`の記述順に進む線形シナリオになる。

## 5. 評価軸

内容評価は80点、応答速度は20点であり、各対話は合計100点となる。トレーニング完了スコアは、完了した対話の平均として100点満点で表示する。

`evaluationAxes`の各要素は次のフィールドを持つ。

| フィールド | 説明 |
| --- | --- |
| `id` | 選択肢の`axisScores`から参照するID |
| `label` | 画面に表示する多言語名 |
| `description` | 評価対象の多言語説明 |
| `maxPoints` | 軸の上限点。全軸の合計を80にする |

```json
"evaluationAxes": [
  {
    "id": "empathy",
    "label": { "ja": "共感", "en": "Empathy", "zh": "同理心" },
    "description": {
      "ja": "相手の感情を受け止める",
      "en": "Acknowledge the other person's feelings.",
      "zh": "理解對方的感受。"
    },
    "maxPoints": 30
  },
  {
    "id": "solution-quality",
    "label": { "ja": "解決策", "en": "Solution quality", "zh": "解決方案" },
    "description": {
      "ja": "実行可能な次の行動を示す",
      "en": "Offer an actionable next step.",
      "zh": "提出可執行的下一步。"
    },
    "maxPoints": 50
  }
]
```

各選択肢の`axisScores`には、宣言したすべての評価軸を過不足なく指定する。点数は0以上、その軸の`maxPoints`以下の整数とする。

## 6. 対話ノードと選択肢

### beat

| フィールド | 説明 |
| --- | --- |
| `id` | 対話ID。シナリオ内で一意 |
| `boke` | キャラクターが発話する多言語テキスト |
| `pronunciationGuide` | `boke`に対応する任意の多言語全文読み |
| `reaction` | 発話時の演技指定 |
| `choices` | プレイヤーの選択肢。2件以上 |

`reaction`には多言語の`description`と1件以上の`motionTags`が必要である。必要に応じて`motionId`、`variant`、`priority`、`cue`を指定できる。

### choice

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `id` | 必須 | 選択肢ID |
| `text` | 必須 | 多言語の回答文 |
| `pronunciationGuide` | 任意 | `text`に対応する多言語全文読み |
| `aliases` | 任意 | 音声認識で同じ回答として扱う言い換え |
| `axisScores` | 必須 | 評価軸ごとの内容点 |
| `feedback` | 必須 | 採点後に表示する多言語講評 |
| `stateEffects` | 任意 | 選択時に適用する状態更新 |
| `routes` | 任意 | 状態更新後に評価する分岐先 |

`aliases`を配列で書いた場合は日本語だけの言い換えとして扱う。多言語対応する場合は`ja`、`en`、`zh`ごとの配列を指定する。

## 7. 状態変数

`stateVariables`は、対話をまたいで保持する値を宣言する。

| フィールド | 説明 |
| --- | --- |
| `id` | 状態ID |
| `label` | 画面表示用の多言語名 |
| `description` | 状態の意味を示す多言語説明 |
| `type` | `number`、`boolean`、`string`のいずれか |
| `initialValue` | `type`と一致する初期値 |
| `minimum` | 数値状態だけに指定できる下限 |
| `maximum` | 数値状態だけに指定できる上限 |

数値状態の更新結果は`minimum`と`maximum`の範囲に収められる。

```json
{
  "id": "trust",
  "label": { "ja": "信頼", "en": "Trust", "zh": "信任" },
  "description": {
    "ja": "相手との信頼度",
    "en": "Trust level with the other person.",
    "zh": "與對方的信任程度。"
  },
  "type": "number",
  "initialValue": 0,
  "minimum": -2,
  "maximum": 3
}
```

## 8. 状態更新

`stateEffects`は選択肢が確定した直後に配列順で適用される。同じ選択肢で同一状態を複数回更新することはできない。

| operation | 対応型 | 動作 |
| --- | --- | --- |
| `set` | すべて | 指定値で置き換える |
| `add` | `number`だけ | 現在値に指定値を加える |

```json
"stateEffects": [
  { "stateId": "trust", "operation": "add", "value": 1 },
  { "stateId": "needs-confirmed", "operation": "set", "value": true }
]
```

## 9. 条件分岐

`routes`は状態更新後に先頭から評価し、最初に一致した分岐へ進む。一つの`conditions`に複数条件がある場合は、すべてを満たす必要がある。

| operator | 説明 |
| --- | --- |
| `equals` | 等しい |
| `not-equals` | 等しくない |
| `greater-than` | より大きい。数値専用 |
| `greater-than-or-equal` | 以上。数値専用 |
| `less-than` | より小さい。数値専用 |
| `less-than-or-equal` | 以下。数値専用 |

最後のrouteは`conditions`を持たないフォールバックにする。`nextBeatId`には存在する対話ID、またはトレーニングを終了する`null`を指定する。

```json
"routes": [
  {
    "conditions": [
      { "stateId": "trust", "operator": "greater-than-or-equal", "value": 2 },
      { "stateId": "needs-confirmed", "operator": "equals", "value": true }
    ],
    "nextBeatId": "successful-close"
  },
  { "nextBeatId": "guarded-close" }
]
```

分岐シナリオでは対話順のランダム化を行わない。復習時は、実際に通過した対話から対象を選び、状態更新と分岐を外した線形シナリオとして実行する。

## 10. 検証

Expressサンプルのディレクトリで次を実行する。

```bash
npm run validate:scenarios
npm run quality:scenarios
npm test
```

`validate:scenarios`はJSON Schemaの構造に加え、次のようなファイル間・項目間の制約を検査する。

- カテゴリID、シナリオID、対話ID、選択肢IDの一意性
- カタログとシナリオ本体のID、タイトル、対話数の一致
- 評価軸の上限合計が80点であること
- 各選択肢がすべての評価軸を採点していること
- 状態の初期値、更新値、比較値が宣言型と一致すること
- 状態更新と条件が宣言済み状態を参照すること
- `startBeatId`と`nextBeatId`が存在する対話を参照すること
- 条件なしのフォールバックが`routes`の最後にあること

`quality:scenarios`は、重複する回答、選択肢間で差のない配点、長すぎる回答、同じモーションの過度な反復など、形式上は有効でも学習品質を下げる可能性がある内容を警告する。

具体的な生成手順とプロンプト要件は[シナリオ生成ガイド](scenario-generation-guide.md)を参照する。
