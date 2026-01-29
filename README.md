# Lyric Timeline Editor

A Vue 3 + TypeScript lyric timeline editor with drag/resize, multi-select, SRT/LRC import, and YouTube sync.

## 一些想說的話

這個專案完全由codex產生與撰寫，沒有查看任何程式碼，提供的初始Prompt如下：

```
我想要撰寫一個歌詞編輯的網頁，操作理念與影片剪輯軟體相同，拖移、拉伸、插入多選移動等，可以讓我輸入歌或直接匯入srt, lrc等資料。但我希望可以不匯入音訊或是影片來進行調整，可以單純直接使用。

然後也可以加入youtube影片根據youtube的時間軸來進行歌詞的編輯，這個可以在最後面實現。

專案的話採用vue3+typescript，UI框架由你決定，然後用pnpm進行管理，那先幫我進行規劃一下。
```

專案調整最多的地方主要在拖動條的邏輯部分，但大多都能一次完成。在介面的設計上gemini的理解會比較精確，隨便說說它就知道東西在哪，codex就比較需要去準確描述哪一個元素，有時候還會詢問你是否是正確的之後，等待你同意才進行修改。

要實現甚麼東西codex比較需要清楚知道你要甚麼需求，而其他模型會比較偏向你希望實現甚麼。這點各有所好，如果你的想法沒有非常明確的話使用其他模型先進行生成，可能會呈現很多原本想不到的東西。而codex可以說是非常工程師的作法，沒有提的基本都不會做，頂多在對話結束時會問你這些東西你想要實現嗎。

其實在試玩的過程中，蠻想要直接去修改程式，因為知道錯誤在哪，知道怎麼修改比較快速，不需要用語言督促模型去修改東西，但為了完整的體驗一下vibe coding，還是慢慢等了。可以理解為甚麼大家喜歡這種形式，因為確實可以非常快速的去實現一個目前都沒有的需求，而且可以做出可以互動的介面會有成就感。

然後對於程式不太熟就不說甚麼程式寫得好不好了，不過目前前端的專案有個問題我一直無法解決，使用`pnpm dev`開啟網頁預覽的時候，會直接堵塞住整個聊天，一定要想辦法關掉，尤其在gemini cli上很明顯，使用codex的時候就沒有這個問題，因為它根本不會幫你開，你必須再開一個終端機去把指令打上，有的話也可以issue跟我說。

另外我沒有安裝任何的MCP或是Skill，實在是有點麻煩就不想要去弄了，但是專案的規劃codex好像已經會自己拆分需求產生多個task，不知道gemini有沒有，過去主要還是github copilot用得比較多。但我覺得其實就算不去安裝任何的東西也可以用得很開心了。期間有遇到一個就是如果不小心退出聊天要怎麼處理，所以有詢問一下它，也就是`STATUS.md`這個檔案出現的原因，雖然我也不知道有沒有用（後來看到可以恢復過去的聊天。

應該就這樣這個專案也沒啥用，就是剪映雲端版東西有點複雜，只是要簡單編輯歌詞還要建立一個專案。市面上的歌詞編輯大部分又都要匯入音訊，所以不知道怎麼處理就自己做一個，然後參考朋友的建議把youtube播放的功能放進去，也能同步時間軸，如果想要玩玩可以嘗試看看。

## Features
- Drag, resize, multi-select, and snap editing on a timeline
- Import SRT/LRC or plain text (one line per lyric)
- Export to SRT or LRC
- Optional YouTube sync for timeline playback
- Left-side lyric list with inline time/text editing

## Usage
1. Click **Import SRT/LRC** to upload an SRT/LRC file or paste text (one line per lyric).
2. Drag segments to move or resize them.
3. Use the left list to edit times/text, play a segment, or delete it.
4. Paste a YouTube URL and click **Load** to sync with video time.
5. Click **Export** to copy or download SRT/LRC.

## Tech Stack
- Vue 3 + TypeScript
- Arco Design Vue
- Vite
- pnpm

## Project Structure
- `src/App.vue`: Main UI and timeline logic
- `src/styles.css`: Global styles
- `src/main.ts`: App bootstrap
- `index.html`: Vite entry

## Setup
```bash
pnpm install
```

## Development
```bash
pnpm dev
```

## Build
```bash
pnpm build
```

## Preview
```bash
pnpm preview
```

## Shortcuts
- Space: Play/Pause
- `+ / -`: Zoom In/Out
- Ctrl/Cmd + Z: Undo
- Shift + Ctrl/Cmd + Z: Redo
- Delete / Backspace: Delete segment
