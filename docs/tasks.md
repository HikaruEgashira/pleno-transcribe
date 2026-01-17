# UI/UX タスクリスト

backlog.mdから精査した、実際に対応が必要な問題のみを抽出。

## 完了済み

### ~~T1. タブバーのタップ領域を44pxに拡大~~ ✅
- **場所**: `app/note/[id].tsx:1794-1802`
- **修正内容**: `paddingVertical: 16`, `minHeight: 44`を追加

### ~~T2. フィルターUIのレイアウト崩れ修正~~ ✅
- **場所**: `app/(tabs)/notes.tsx:1059-1067`
- **修正内容**: filterRowに`flexWrap: "wrap"`, `gap: 8`を追加

### ~~T3. ハイライト削除ボタンのタップ領域拡大~~ ✅
- **場所**: `app/note/[id].tsx:1914-1920`
- **修正内容**: `padding: 10`, `minWidth: 44`, `minHeight: 44`を設定

### ~~T4. Q&A入力欄のキーボード対応改善~~ ✅
- **場所**: `app/note/[id].tsx:775-779`
- **修正内容**: `keyboardVerticalOffset`を追加

### ~~T5. 波形バー数を画面幅に応じて動的計算~~ ✅
- **場所**: `app/(tabs)/record.tsx:38-40`, `app/note/[id].tsx:73-74`
- **修正内容**: `useResponsive()`からwidthを取得し、`Math.floor((screenWidth - 72) / 8)`で動的計算

### ~~T7. スマートフォルダーのスクロール可能性を視覚化~~ ✅
- **場所**: `app/(tabs)/notes.tsx:611-615`
- **修正内容**: ScrollViewに`fadingEdgeLength={40}`を追加

### ~~T8. 感情バーのラベル幅を相対値に変更~~ ✅
- **場所**: `app/note/[id].tsx:2279-2283`
- **修正内容**: `width: 40`を`minWidth: 40`, `flexShrink: 0`に変更

### ~~T9. 再生速度変更時のフィードバック強化~~ ✅
- **場所**: `app/note/[id].tsx:241-264`, `943-953`
- **修正内容**: Animated.sequenceでスケールアニメーション(1→1.15→1)を追加

### ~~T10. 翻訳ボタンのローディング状態改善~~ ✅
- **場所**: `app/note/[id].tsx:1063-1086`
- **修正内容**: ローディング中は背景色をmutedに変更し、「翻訳中...」テキストを表示

### ~~T6. 日付入力をDatePickerに変更~~ ✅
- **場所**: `app/note/[id].tsx:1307-1350`
- **修正内容**: `@react-native-community/datetimepicker`を導入し、TextInputをDateTimePickerに置換

### ~~V5. カードグリッドの余白不均一~~ ✅
- **場所**: `app/(tabs)/notes.tsx:1123-1127`, `153-166`
- **修正内容**: columnWrapperに`gap: 12`追加、カード幅を`flex: 1`に変更

### ~~V8. コンテンツの過剰な余白~~ ✅
- **場所**: `app/(tabs)/notes.tsx:1118-1123`
- **修正内容**: `maxWidth: 1400`, `paddingHorizontal: 40`に調整

---

## 対応不要（調査済み）

- **V13. SafeArea対応の不整合** - ScreenContainerで適切に処理済み、ハードコードなし

---

## 対応不要と判断した項目

| backlog# | 理由 |
|----------|------|
| 2. 検索履歴z-index | 実際の問題報告なし、衝突は稀 |
| 5. タイトル切り詰め | RNデフォルトでtailモード動作、問題なし |
| 13. スワイプ削除の発見性 | ヒント表示は直感性を損なう |
| 14. タグチップカラー | 現状で視認性に問題なし |
| 17. 一括選択モード | 現状で十分識別可能 |
| 18. 空状態イラスト | 機能に影響なし、デザイン上の好み |
