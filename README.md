# StoryCardWriter Desktop

Android版StoryCardWriterで保存したJSONを、カードの順序と配置を保ったまま開き、編集して保存するElectronアプリです。

## 起動

```sh
pnpm install
pnpm start
```

## 対応範囲

- 新規、開く、保存、名前を付けて保存
- 主題、アイデア、対案、参考、意見、決定カード
- カード追加、編集、削除、後に追加
- Android版JSONの順序・既知項目・未知の追加項目の保持

共有、ブレーンストーム、SCR階層、ダブルクリックによる別画面は未実装です。

## macOSアプリの作成

Intel Mac向けの署名なしアプリを作成します。

```sh
pnpm build:mac
```

またはnpmを使用する場合：

```sh
npm run build:mac
```

完成したアプリは `dist/mac/StoryCardWriter Desktop.app` に出力されます。
