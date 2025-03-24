# RAG チュートリアルワークショップ
Node.jsを使用してリトリーバル増強生成（RAG）システムを構築し理解するためのステップバイステップチュートリアル。

## 概要
このワークショップでは、基本的なチャットアプリケーションから高度な検索システムまで、段階的な例を通じてRAGに実践的な入門を提供します。初心者向けに設計されており、約1.5時間で完了できます。

## 前提条件
- Node.jsがインストールされていること（v14+推奨）
- Ollamaがインストールされていること
- JavaScriptの基本的な知識
- テキストエディタまたはIDE

システムセットアップについては以下を参照：
- [ワークショップ要件 EN](workshop_requirements_rag_en.txt)（英語）
- [ワークショップ要件 JA](workshop_requirements_rag_ja.txt)（日本語）

## プロジェクト構造
```
RAGTutorial/
├── README.md                     # このファイル
├── workshop_requirements_en.md   # 要件（英語）
├── workshop_requirements_ja.md   # 要件（日本語）
├── docs/                         # RAG用のサンプルドキュメント
│   ├── ADD_YOUR_OWN_DOCS_HERE.md
│   ├── lost-signal-of-elara-7_en.md
│   └── lost-signal-of-elara-7_ja.md
├── slides/                       # ワークショップスライド
├── 01-basic-chat/                # Ollamaを使用した簡単なチャット
├── 02-function-calling/          # 関数呼び出しの例
├── 03-basic-rag/                 # Ollamaを使用した簡単なRAG
├── 04-function-rag-decision/     # RAGのための関数呼び出し
└── 05-agent-rag-decision/        # エージェントRAG
```

## ワークショップの段階
ワークショップのスライドについては[slides/slides.pdf](slides/slides.pdf)を参照してください。

## 始め方
1. このリポジトリをクローンする
2. コマンドラインからOllamaを使用して、使用したいモデルを取得する：
   ```
   ollama pull qwen2.5:3b
   ollama pull nomic-embed-text
   ```
3. まず共通の依存関係をインストールする：
   ```
   cd common
   npm install
   ```
4. 次に実行したい例の依存関係をインストールする：
   ```
   cd ../01-basic-chat
   npm install
   ```
5. サーバーを起動する：
   ```
   npm start
   ```
6. ブラウザでhttp://localhost:3000を開く

別のモデルを使用したい場合は、`.env.example`ファイルを`.env`にコピーしてモデル名を設定してください。例：
```
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=qwen2.5:7b # インストールしたモデルに変更する
EMBEDDING_MODEL_NAME=nomic-embed-text
```

## リソース
- [OpenAI APIドキュメント](https://platform.openai.com/docs/)
- [Ollamaプロジェクト](https://ollama.ai/)
- [Node.jsドキュメント](https://nodejs.org/en/docs/)

## 連絡先
*Davide Pasca*:
- [davide@newtypekk.com](mailto:davide@newtypekk.com)
- [github.com/dpasca](https://github.com/dpasca)
- [newtypekk.com](https://newtypekk.com)
- [x.com/109mae](https://x.com/109mae)