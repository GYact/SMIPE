# SMIPE

<p align="center">
  <img src="app/assets/images/SMIPE_logo.png" alt="SMIPE Logo" width="200"/>
</p>

<p align="center">
  <strong>音楽で、世界とつながる。あなたのいる場所が、新しいプレイリストになる。</strong>
</p>

## 📖 概要

SMIPEは、位置情報と音楽を組み合わせた革新的なソーシャル音楽共有プラットフォームです。Spotify APIと連携し、ユーザーの現在地に基づいて、近くにいる人々と音楽を共有し、新しい音楽の発見を促進します。

## ✨ 主な機能

### 🗺️ 位置情報機能
- **現在地の共有**: GPSを使用して現在地を取得・更新
- **近くのユーザー検索**: 指定した半径内にいるユーザーを発見
- **マップビュー**: インタラクティブな地図で位置情報を可視化

### 🎵 音楽機能
- **Spotify連携**: Spotifyアカウントでログイン
- **プレイリスト管理**: 自分のプレイリストを表示・管理
- **音楽プレイヤー**: Web上で直接音楽を再生
- **トラック情報表示**: 曲の詳細情報を確認

### 👥 ソーシャル機能
- **ユーザープロフィール**: Spotifyのプロフィール情報を表示
- **音楽の共有**: 他のユーザーが聴いている音楽を発見
- **共通の音楽趣味**: 近くにいる同じ音楽好きのユーザーとつながる

## 🛠 技術スタック

### バックエンド
- **Ruby on Rails 8.0.~**
- **Ruby 3.3**
- **SQLite3** (開発環境)

### フロントエンド
- **Stimulus.js** (Rails標準のJavaScriptフレームワーク)
- **Turbo** (SPA-likeな体験を提供)
- **Import Maps** (モダンなJavaScript管理)

### 外部API・サービス
- **Spotify Web API** (音楽データと再生機能)
- **OmniAuth Spotify** (認証)
- **RSpotify** (Spotify APIのRubyラッパー)

### デプロイメント・インフラ
- **Docker** (コンテナ化)
- **Kamal** (デプロイメントツール)
- **GitHub Actions** (CI/CD)

## 📋 必要要件

- Ruby 3.2.2以上
- Rails 8.0.0以上
- Node.js (JavaScript実行環境)
- Spotify開発者アカウント
- Spotify APIの認証情報（Client ID、Client Secret）

## 🚀 セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/SMIPE.git
cd SMIPE
```

### 2. 依存関係のインストール

```bash
bundle install
```

### 3. 環境変数の設定

`.env`ファイルをプロジェクトルートに作成し、以下の環境変数を設定：

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### 4. データベースのセットアップ

```bash
rails db:create
rails db:migrate
rails db:seed # (オプション：サンプルデータの投入)
```

### 5. アプリケーションの起動

```bash
rails server
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 🐳 Dockerでの実行

```bash
# イメージのビルド
docker build -t smipe .

# コンテナの起動
docker run -p 3000:3000 -e SPOTIFY_CLIENT_ID=your_id -e SPOTIFY_CLIENT_SECRET=your_secret smipe
```

## 📱 使い方

1. **ログイン**: ホームページからSpotifyアカウントでログイン
2. **位置情報の許可**: ブラウザで位置情報の使用を許可
3. **マップ表示**: `/map`で現在地と近くのユーザーを確認
4. **プレイリスト**: `/playlists`で自分のプレイリストを管理
5. **音楽再生**: `/player`で音楽を再生

## 🧪 テスト

```bash
# 全てのテストを実行
rails test

# システムテストを含む全テストの実行
rails test:system
```

## 🔒 セキュリティ

- Brakemanによる静的セキュリティ解析を実施
- 環境変数による機密情報の管理
- モダンブラウザのみをサポート（セキュリティ向上のため）

## 📝 開発ガイドライン

### コーディング規約
- RuboCop Rails Omakaseに準拠
- 行の最大長: 120文字
- メソッドの最大行数: 15行

### ブランチ戦略
- `main`: プロダクション環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `hotfix/*`: 緊急修正

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

## 📧 お問い合わせ

プロジェクトに関する質問や提案がある場合は、[Issues](https://github.com/yourusername/SMIPE/issues)でお知らせください。

---

<p align="center">
  Made with ❤️ by SMIPE Team
</p>
