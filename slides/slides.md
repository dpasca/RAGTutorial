---
marp: true
theme: default
paginate: true
backgroundColor: #fff
---

# Retrieval-Augmented Generation (RAG) Workshop
# 検索強化生成（RAG）ワークショップ

> A step-by-step guide to building and understanding RAG systems
> RAGシステムの構築と理解のためのステップバイステップガイド
<br>
<br>
<div style="text-align: right; font-size: 0.8em;">
by Davide Pasca
</div>
<div style="text-align: right; font-size: 0.8em;">
v 0.1
</div>

<div style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 0.8em;">
<a href="https://github.com/dpasca/RAGTutorial">https://github.com/dpasca/RAGTutorial</a>
</div>

---

# Quickstart

- Install **Git**, **Node.js** and **Ollama**. See:
  - [Workshop Requirements EN](workshop_requirements_rag_en.txt) (English)
  - [Workshop Requirements JA](workshop_requirements_rag_ja.txt) （日本語）

```bash
#------------------------- (1) Clone this repository
git clone https://github.com/dpasca/RAGTutorial.git
#------------------------- (2) Get the required Ollama models
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
#------------------------- (3) Navigate to a lesson and install deps
cd 01-basic-chat
npm install
#------------------------- (4) Start the server
npm start
#------------------------- (5) Go to http://localhost:3000 in your browser
```

---

# What is RAG?

**Retrieval-Augmented Generation (RAG) `-` 検索強化生成（RAG）**
- Fast fuzzy search + LLM intelligence `-` 高速なあいまい検索とLLMの知能

**Benefits: 利点:**
- Extends knowledge of LLM to any document database
  LLMの知識を任意のドキュメントデータベースに拡張
- The Language Model can be small (SML instead of LLM)
  言語モデルは小さくてもよい（LLMではなくSML）
- Reliable responses (can mention sources)
  信頼性のある応答（ソースを言及可能）

---

# Workshop Overview

A progressive approach to understanding and implementing RAG:
RAGを理解し実装するための段階的アプローチ

1. **Basic Chat** - Simple AI chat `-` 基本的なチャット - シンプルなAIチャット
2. **Function Calling** - AI chat with function-calling `-` 関数呼び出し付きAIチャット
3. **Basic RAG** - Basic RAG pattern `-` 基本的なRAGパターン
4. **Function-Based RAG** - RAG with function-calling `-` 関数呼び出しを用いたRAG
5. **Agentic RAG** - RAG with agents `-` エージェントを用いたRAG

---

# Stage 1: Basic Chat

**Objective:** Create a simple chat interface using OpenAI API
シンプルなチャットインターフェースをOpenAI APIを使用して作成する

**Key Concepts:**
- Chat with Express server and REST API
  ExpressサーバーとREST APIでのチャット
- Using Ollama via OpenAI API compatible endpoint
  OpenAI API互換エンドポイントを介したOllamaの使用

**Lessons to learn:**
- Limit message history to improve performance and reduce costs
  メッセージ履歴を制限してパフォーマンスを向上させ、コストを削減する

---

# Stage 1: Basic Chat (continued)

1. Create a list of messages between `user` and `assistant`
   `user`と`assistant`の間のメッセージリストを作成
2. On user input, add new `user` messages to the history
   ユーザー入力時に新しい`user`メッセージを履歴に追加
3. Call Completions API with all messages
   すべてのメッセージでCompletions APIを呼び出す
4. Get `assistant` response and add it to the history
   `assistant`の応答を取得して履歴に追加
5. Wait for next user input and repeat...
   次のユーザー入力を待って繰り返す...

---

# Stage 2: Function Calling (FC)

**Objective:** Enhance the chat with function calling capabilities
関数呼び出し機能を備えたチャットを強化する

**Key Concepts:**
- Using LLM function-calling (aka tool-calling)
  LLMの関数呼び出し（ツール呼び出しとも呼ばれる）の使用

**Lessons to learn:**
- Language Models may not support FC
  言語モデルはFCをサポートしていない場合がある
- Small Language Models are bad at FC (they tend to use FC too much !)
  小型言語モデルはFCが苦手（FCを過剰に使用する傾向がある！）

---

# Stage 3: Basic RAG

**Objective:** Implement the core RAG pattern from scratch
コアRAGパターンをゼロから実装する

**Key Concepts:**
- Document chunking and indexing
  ドキュメントのチャンク化とインデックス化
- Semantic search and similarity
  セマンティック検索と類似性
- Context window management
  コンテキストウィンドウの管理

---

# Stage 3: Basic RAG (continued)

**Lessons to learn:**
- A lot of unnecessary RAG access (no need to use rag RAG for *"Hello"*)
  多くの不要なRAGアクセス（例：「Hello」のRAG検索は不要）
- Small Language Models get distracted by unnecessary context added by RAG
  小型言語モデルはRAGによって追加された不要なコンテキストに気を取られる
- Search of user query may not be enough (user asks *"car that won't start"*, but database has *"car ignition problems"* entry)
  ユーザーのクエリ検索が不十分な場合がある（ユーザーが「エンジンがかからない車」と尋ねても、データベースには「車の点火問題」のエントリがある）

---

# Stage 4: Function-Based RAG Decision

**Objective:** Use function-calling to intelligently decide when to use RAG
関数呼び出しを使用してRAGを使用するタイミングをインテリジェントに決定する

**Key Concepts:**
- Teaching an LLM _when_ to use RAG to improve accuracy and reduce costs
  精度を向上させコストを削減するために、LLMにRAGを使用するタイミングを教える

**Lessons to learn:**
- Needs trial and error to find the best prompt to use function-calling effectively
  関数呼び出しを効果的に使用するための最適なプロンプトを見つけるには試行錯誤が必要

---

# Stage 5: Agentic RAG Decision

**Objective:** Use an "agent" to decide when to use RAG
エージェントを使用してRAGを使用するタイミングを決定する

**Key Concepts:**
- Home-made function-calling, but more flexible !
  自作の関数呼び出し、しかしより柔軟！
- Hidden "agent" prepares context before calling the user-facing model.
  隠れた「エージェント」がユーザー向けモデルを呼び出す前にコンテキストを準備する
- Can be used for model-routing (math question→large model, "hello!"→small model)
  モデルルーティングに使用可能（数学の質問→大モデル、「こんにちは！」→小モデル）

---

# Implementation Architecture

An **Agent LLM** decides if RAG is needed, and responds with a search query.
エージェントLLMがRAGの必要性を判断し、検索クエリで応答します。
Search results are attached to the user message for the benefit of the user-facing LLM.
検索結果はユーザー向けLLMのためにユーザーメッセージに添付されます。

<div style="display: flex; justify-content: center; align-items: center;">
  <img src="images/rag_arch_agent.png" alt="RAG Architecture" style="max-width: 100%; height: auto;">
</div>

---

# Example Application

<div style="display: flex; justify-content: center; align-items: center;">
  <img src="images/rag_comparison.png" alt="RAG Comparison" style="max-width: 90%; height: auto;">
</div>

Our sample document "The Lost Signal of Elara-7" demonstrates how RAG enhances LLM responses:
サンプルドキュメント「The Lost Signal of Elara-7」は、RAGがLLMの応答をどのように強化するかを示しています：

- Without RAG: Generic responses based on training data
  RAGなし：トレーニングデータに基づく一般的な応答
- With RAG: Specific responses incorporating details about:
  RAGあり：以下の詳細を組み込んだ具体的な応答：
  - Mining colony on Elara-7
    エララ-7の採掘コロニー
  - Chief Engineer Mara Kade's last message
    チーフエンジニアのマラ・ケイドの最後のメッセージ
  - The mysterious crystalline structures
    神秘的な結晶構造
  - The Icarus Dawn investigation team
    イカロス・ドーン調査チーム

---

# Thank You!

**Resources:**
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Ollama Project](https://ollama.ai/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

**Contact:**

*Davide Pasca*:
- [davide@newtypekk.com](mailto:davide@newtypekk.com)
- [github.com/dpasca](https://github.com/dpasca)
- [newtypekk.com](https://newtypekk.com)
- [x.com/109mae](https://x.com/109mae)