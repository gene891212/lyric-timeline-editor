<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳至主要內容</a>
    <header class="lx-header">
      <div class="lx-brand">
        <svg class="lx-brand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>
        <span class="lx-brand-divider"></span>
        <div><h1 class="lx-brand-title">Lyric Sync Editor</h1><div class="lx-brand-sub">歌詞同步編輯器 · 製作精準的 LRC / SRT 字幕</div></div>
      </div>
      <div class="lx-header-actions">
        <button class="btn btn-secondary" type="button" title="支援 .lrc, .srt, .txt" @click="importVisible = true"><FileInput :size="16" />匯入檔案</button>
        <button class="btn btn-primary" type="button" @click="openExport"><Download :size="16" />匯出</button>
        <button class="btn-icon" type="button" title="使用說明" aria-label="使用說明" @click="shortcutsVisible = true"><CircleHelp :size="17" /></button>
      </div>
    </header>

    <main id="main-content" class="lx-main">
      <section class="col" aria-label="媒體與歌曲設定">
        <section class="card">
          <div class="row-between"><h2 class="card-title"><span class="title-icon">◉</span>音訊 / 影片來源</h2></div>
          <div class="seg" role="tablist">
            <button v-for="option in mediaOptions" :key="option.value" :class="{ 'is-active': media.mode.value === option.value }" type="button" role="tab" :aria-selected="media.mode.value === option.value" @click="selectMediaMode(option.value)">{{ option.label }}</button>
          </div>
          <div v-if="media.mode.value === 'none'" class="empty-state"><span class="empty-state-icon">♧</span><p>純文字編輯模式</p><p class="empty-state-note">可隨時切換至 YouTube 或本機音檔配樂</p></div>
          <form v-else-if="media.mode.value === 'youtube'" class="col-gap" @submit.prevent="loadYouTubeVideo">
            <label class="field-label" for="youtube-url">YouTube 網址</label>
            <div class="row"><input id="youtube-url" v-model="youtubeInput" class="input" type="url" placeholder="貼上 YouTube 網址…" /><button class="btn btn-primary" type="submit">{{ media.isLoading.value ? '載入中' : '載入' }}</button></div>
            <div class="yt-frame"><div ref="youtubeMount" class="youtube-player"></div><div v-if="!media.youtubeVideoId.value" class="yt-placeholder"><span class="empty-state-icon">▶</span><p>輸入 YouTube 影片網址並點擊載入</p><p class="url-example">https://youtube.com/watch?v=…</p></div></div>
          </form>
          <div v-else class="col-gap">
            <label class="field-label" for="audio-upload">本機音檔</label>
            <label class="drop-zone" for="audio-upload"><span class="drop-icon">↥</span><strong>{{ localFileName || '選擇音樂檔案' }}</strong><span>支援 MP3、WAV、M4A 等格式</span><input id="audio-upload" type="file" accept="audio/*" @change="handleAudioUpload" /></label>
            <audio ref="audioRef" class="audio-player" controls></audio>
          </div>
          <p v-if="media.errorMessage.value" class="inline-error" role="alert">{{ media.errorMessage.value }}</p>
        </section>

        <section class="card">
          <h3 class="card-title">設定與操作</h3>
          <div class="col-gap"><span class="label">歌曲資訊 · Metadata</span><input id="meta-title" v-model="project.metadata.title" class="input" type="text" placeholder="歌曲名稱 (ti)" /><input id="meta-artist" v-model="project.metadata.artist" class="input" type="text" placeholder="歌手 / 演出者 (ar)" /><input id="meta-album" v-model="project.metadata.album" class="input" type="text" placeholder="專輯名稱 (al)" /></div>
          <div class="hint-block"><div class="hint-title"><Keyboard :size="14" />同步模式快捷鍵</div><div class="hint-row"><span><kbd>Space</kbd></span><span class="lbl">打上時間並跳至下一行</span></div><div class="hint-row"><span><kbd>Shift</kbd><kbd>Space</kbd></span><span class="lbl">播放 / 暫停</span></div><div class="hint-row"><span><kbd>Enter</kbd></span><span class="lbl">清除當前行時間</span></div><div class="hint-row"><span><kbd>↑ ↓</kbd></span><span class="lbl">切換選取行</span></div></div>
        </section>
      </section>

      <section class="col">
        <nav class="tabs" aria-label="編輯步驟"><div class="tab-list" role="tablist"><button v-for="tab in tabs" :key="tab.value" class="tab" :class="{ 'is-active': currentTab === tab.value }" type="button" role="tab" :aria-selected="currentTab === tab.value" @click="switchTab(tab.value)"><span class="tab-num">{{ Number(tab.number) }}</span>{{ tab.label }}</button></div><div class="time-display" :class="{ 'is-playing': isPlaying }"><span class="dot"></span><span>時間 <strong>{{ formatClock(playheadMs) }}</strong></span></div></nav>

        <section v-if="currentTab === 'edit'" class="panel-body">
          <div class="panel-toprow"><span>直接輸入或貼上歌詞 · 系統會自動辨識 LRC / SRT 並轉換時間軸</span><button class="danger-link" type="button" @click="clearLyrics">⌫ 清空歌詞</button></div>
          <textarea v-model="editableText" class="textarea" spellcheck="false" placeholder="在此處輸入或貼上歌詞…&#10;&#10;例：&#10;第一行歌詞&#10;第二行歌詞&#10;&#10;支援 LRC 或 SRT 字幕，系統會自動轉換時間軸"></textarea>
        </section>

        <section v-else-if="currentTab === 'sync'" class="panel-body">
          <div class="sync-view-guidance">
            <span class="sync-view-copy">用列表逐行打點，或切換時間軸微調區段起訖。</span>
            <div class="sync-setting-row">
              <div class="sync-mode-switch"><span class="sync-mode-label">同步方式</span><div class="view-switch" role="tablist" aria-label="同步方式"><button class="view-switch-button" :class="{ 'is-active': syncView === 'timeline' }" type="button" @click="syncView = 'timeline'"><SlidersHorizontal :size="14" />時間軸微調</button><button class="view-switch-button" :class="{ 'is-active': syncView === 'list' }" type="button" @click="syncView = 'list'"><List :size="14" />列表打點</button></div></div>
              <div v-if="syncView === 'list'" class="sync-mode-switch"><span class="sync-mode-label">打點格式</span><div class="view-switch" role="tablist" aria-label="打點格式"><button class="view-switch-button" :class="{ 'is-active': stampMode === 'lrc' }" type="button" role="tab" :aria-selected="stampMode === 'lrc'" @click="stampMode = 'lrc'">LRC 單點</button><button class="view-switch-button" :class="{ 'is-active': stampMode === 'srt' }" type="button" role="tab" :aria-selected="stampMode === 'srt'" @click="stampMode = 'srt'">SRT 區間</button></div></div>
            </div>
          </div>
          <div class="current-lyric" :class="{ 'has-lyric': activePlaybackLine }"><strong>{{ activePlaybackLine?.text || '尚未播放到歌詞' }}</strong></div>
          <div class="sync-playback-bar">
            <div class="player-cluster"><button class="play-btn" type="button" :aria-label="isPlaying ? '暫停' : '播放'" @click="togglePlayback"><Pause v-if="isPlaying" :size="15" fill="currentColor" /><Play v-else :size="15" fill="currentColor" /></button><div class="speed-pill"><button type="button" @click="adjustPlaybackRate(-0.1)">−</button><span class="indicator">{{ project.playbackRate.toFixed(1) }}×</span><button type="button" @click="adjustPlaybackRate(0.1)">＋</button></div><span class="sync-time">{{ formatClock(playheadMs) }}</span></div>
            <div v-if="syncView === 'list'" class="timeline-toolbar-group timeline-actions">
              <button class="btn btn-quiet btn-sm" type="button" @click="resetTimestamps">重設所有時間</button>
              <button class="btn btn-primary sync-stamp-button" type="button" @click="stampActiveLine"><CircleDot :size="15" />{{ activeStampLabel }} · Space</button>
            </div>
            <div v-else class="timeline-toolbar-group timeline-actions">
              <button class="btn btn-quiet btn-sm" type="button" @click="timelineEditorRef?.resolveOverlaps()">整理重疊</button>
              <button class="btn btn-quiet btn-sm" type="button" :aria-pressed="autoFollow" @click="autoFollow = !autoFollow">跟隨：{{ autoFollow ? '開' : '關' }}</button>
              <label class="zoom-control">
                <span>縮放</span>
                <input v-model.number="zoomLevel" type="range" min="5" max="160" step="5" />
                <output>{{ zoomLevel }}%</output>
              </label>
            </div>
          </div>
          <template v-if="syncView === 'list'">
            <div class="sync-banner"><span class="msg"><template v-if="stampMode === 'lrc'">LRC 單點：按下 <kbd>Space</kbd> 記錄開始時間並跳至下一行。</template><template v-else>SRT 區間：按第一次記錄開始，按第二次記錄結束並跳至下一行。</template></span></div>
            <div class="sync-list" aria-label="歌詞同步列表">
              <div v-if="orderedLines.length === 0" class="list-empty"><span class="empty-kicker">NO LYRICS</span><strong>尚無歌詞文字</strong><span>回到第一步貼上歌詞後開始同步。</span></div>
              <article v-for="(line, index) in orderedLines" :id="'sync-line-' + line.id" :key="line.id" class="sync-line" :class="{ 'is-active': project.activeLineId === line.id }" @click="selectLine(line)">
                <div class="sync-line-main"><span class="line-number">{{ String(index + 1).padStart(2, '0') }}</span><div class="line-time-fields"><template v-if="stampMode === 'lrc'"><span class="line-time">{{ line.startMs === null ? '—' : formatClock(line.startMs) }}</span></template><template v-else><span class="line-time">{{ line.startMs === null ? '—' : formatClock(line.startMs) }}</span><span>→</span><span class="line-time">{{ line.endMs === null ? '—' : formatClock(line.endMs) }}</span></template></div><span class="line-text">{{ line.text }}</span></div>
                <div class="sync-line-actions"><span class="line-number">{{ String(index + 1).padStart(2, '0') }}</span><button v-if="line.startMs !== null || line.endMs !== null" class="line-action" type="button" @click.stop="clearLineStamp(line.id)">清除時間</button><button class="line-action" type="button" @click.stop="stampLine(line.id)">{{ stampButtonLabel(line) }}</button></div>
              </article>
            </div>
          </template>
          <TimelineEditor v-else ref="timelineEditorRef" :lines="project.lines" :playhead-ms="playheadMs" :selection-ids="selectionIds" :is-playing="isPlaying" :auto-follow="autoFollow" :media-duration-ms="durationMs" :zoom-level="zoomLevel" @update:lines="onTimelineLinesUpdate" @update:playhead-ms="setPlayhead" @update:selection-ids="selectionIds = new Set($event)" @update:auto-follow="autoFollow = $event" @update:zoom-level="zoomLevel = $event" @history="recordHistory($event)" @undo="undo" @redo="redo" @toggle-play="togglePlayback" @stop-play="stopPlayback" />
        </section>

        <section v-else class="panel-body">
          <div class="preview-shell"><div class="preview-controls"><button class="skip-btn" type="button" @click="skipPlayback(-5)">← 5s</button><button class="play-btn play-btn-lg" type="button" :aria-label="isPlaying ? '暫停' : '播放'" @click="togglePlayback"><Pause v-if="isPlaying" :size="22" fill="currentColor" /><Play v-else :size="22" fill="currentColor" /></button><button class="skip-btn" type="button" @click="skipPlayback(5)">5s →</button><span class="preview-time">{{ formatClock(playheadMs) }}</span></div>
          <div ref="previewRef" class="karaoke"><div v-if="timedLines.length === 0" class="empty-state"><span class="empty-state-icon">♫</span><p>尚未有任何時間標記歌詞</p><p class="empty-state-note">請至「製作時間同步」為歌詞打上時間軸</p></div><button v-for="line in timedLines" :id="'preview-line-' + line.id" :key="line.id" class="karaoke-line" :class="{ 'is-active': activePlaybackLine?.id === line.id }" type="button" @click="seekTo(line.startMs ?? 0)">{{ line.text || '空白行' }}</button></div></div>
        </section>
      </section>
    </main>
    <footer class="lx-footer">© 2026 Lyric Sync Editor <span class="dot">·</span> 免安裝 · 無廣告 · 支援 LRC / SRT 格式</footer>

    <div v-if="importVisible" class="modal-backdrop" @click.self="importVisible = false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><div class="modal-heading"><div><span class="content-kicker">IMPORT</span><h2 id="import-title">匯入歌詞</h2></div><button class="modal-close" type="button" @click="importVisible = false">×</button></div><label class="drop-zone compact-drop" for="import-file"><span class="drop-icon">↥</span><strong>選擇 LRC、SRT 或 TXT</strong><span>也可以直接在下方貼上內容</span><input id="import-file" type="file" accept=".lrc,.srt,.txt,text/plain" @change="handleImportFile" /></label><label class="field-label" for="import-text">歌詞內容</label><textarea id="import-text" v-model="importText" class="modal-textarea" placeholder="貼上 LRC、SRT 或純文字歌詞。"></textarea><p class="modal-hint">ⓘ 純文字會保留為未定時歌詞。</p><div class="modal-actions"><button class="btn btn-secondary" type="button" @click="importVisible = false">取消</button><button class="btn btn-primary" type="button" :disabled="!importText.trim()" @click="applyImport">匯入內容</button></div></section></div>
    <div v-if="exportVisible" class="modal-backdrop" @click.self="exportVisible = false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="export-title"><div class="modal-heading"><div><span class="content-kicker">EXPORT</span><h2 id="export-title">匯出歌詞</h2></div><button class="modal-close" type="button" aria-label="關閉匯出視窗" @click="exportVisible = false"><X :size="18" /></button></div><div class="format-picker"><button class="format-option" :class="{ 'is-active': exportFormat === 'srt' }" type="button" @click="exportFormat = 'srt'"><FileText :size="14" />SRT</button><button class="format-option" :class="{ 'is-active': exportFormat === 'lrc' }" type="button" @click="exportFormat = 'lrc'"><FileText :size="14" />LRC</button></div><textarea class="modal-textarea export-preview" :value="exportText" readonly></textarea><div class="modal-actions"><button class="btn btn-secondary" type="button" @click="copyExport"><Copy :size="15" />複製內容</button><button class="btn btn-primary" type="button" @click="downloadExport"><Download :size="15" />下載檔案</button></div></section></div>
    <div v-if="shortcutsVisible" class="modal-backdrop" @click.self="shortcutsVisible = false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="guide-title"><div class="modal-heading"><div><span class="content-kicker">QUICK GUIDE</span><h2 id="guide-title">使用說明</h2></div><button class="modal-close" type="button" @click="shortcutsVisible = false">×</button></div><div class="guide-grid"><article><span class="guide-number">01</span><h3>輸入歌詞</h3><p>貼上純文字、LRC 或 SRT。</p></article><article><span class="guide-number">02</span><h3>同步時間</h3><p>列表適合逐行打點，時間軸適合微調。</p></article><article><span class="guide-number">03</span><h3>接上媒體</h3><p>支援 YouTube、本機音檔與無媒體預覽。</p></article><article><span class="guide-number">04</span><h3>輸出成果</h3><p>匯出 LRC 或 SRT 並下載。</p></article></div><div class="guide-shortcuts"><div><kbd>Space</kbd><span>列表打點 / 時間軸播放</span></div><div><kbd>Ctrl/Cmd + Z</kbd><span>復原</span></div><div><kbd>Shift + Ctrl/Cmd + Z</kbd><span>重做</span></div><div><kbd>Delete</kbd><span>刪除時間軸選取</span></div></div><div class="modal-actions"><button class="btn btn-primary" type="button" @click="shortcutsVisible = false">知道了</button></div></section></div>
    <div class="sr-only" aria-live="polite">{{ statusMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TimelineEditor from './components/TimelineEditor.vue'
import { useMediaController } from './composables/useMediaController'
import { CircleDot, CircleHelp, Copy, Download, FileInput, FileText, Keyboard, List, Pause, Play, SlidersHorizontal, X } from '@lucide/vue'
import { buildLrc, buildSrt, formatClock, isTimedLine, parseLyrics, sortLinesForDisplay, updateDerivedEndTimes } from './utils/lyric-format'
import { loadProject, saveProject } from './utils/storage'
import { cloneLines, createProject, type ExportFormat, type LyricLine, type MediaMode, type Project } from './types'

type Tab = 'edit' | 'sync' | 'preview'
type SyncView = 'list' | 'timeline'
type StampMode = 'lrc' | 'srt'
const DEFAULT_LYRICS = '1\n00:00:01,500 --> 00:00:05,200\n歡迎使用歌詞同步編輯器\n\n2\n00:00:05,200 --> 00:00:09,800\n在列表中按下空白鍵開始打點\n\n3\n00:00:09,800 --> 00:00:14,000\n切換時間軸可以調整歌詞區段\n\n4\n00:00:14,000 --> 00:00:18,500\n也可以貼上 YouTube 或載入本機音檔\n\n5\n00:00:18,500 --> 00:00:21,500\n完成後匯出 SRT 或 LRC'
const initialProject = (): Project => { const saved = loadProject(); if (saved) return saved; const parsed = parseLyrics(DEFAULT_LYRICS); const next = createProject(parsed.lines); next.metadata = parsed.metadata; return next }
const project = ref<Project>(initialProject())
const currentTab = ref<Tab>('edit')
const syncView = ref<SyncView>('timeline')
const stampMode = ref<StampMode>('lrc')
const editableText = ref(buildSrt(project.value.lines))
const importVisible = ref(false)
const importText = ref('')
const exportVisible = ref(false)
const shortcutsVisible = ref(false)
const exportFormat = ref<ExportFormat>('srt')
const selectionIds = ref(new Set<string>())
const autoFollow = ref(true)
const zoomLevel = ref(80)
const timelineEditorRef = ref<InstanceType<typeof TimelineEditor> | null>(null)
const playheadMs = ref(0)
const fakePlaying = ref(false)
const saveState = ref<'saved' | 'saving'>('saved')
const localFileName = ref('')
const youtubeInput = ref('')
const previewRef = ref<HTMLElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const youtubeMount = ref<HTMLElement | null>(null)
const statusMessage = ref('')
const undoStack = ref<LyricLine[][]>([])
const redoStack = ref<LyricLine[][]>([])
let fakeRaf = 0
let fakeLastTs = 0
const media = useMediaController()
const tabs = [{ value: 'edit' as Tab, number: '01', label: '編輯歌詞文字' }, { value: 'sync' as Tab, number: '02', label: '製作時間同步' }, { value: 'preview' as Tab, number: '03', label: '動態歌詞預覽' }]
const mediaOptions: Array<{ value: MediaMode; label: string }> = [{ value: 'none', label: '無媒體' }, { value: 'youtube', label: 'YouTube' }, { value: 'local', label: '本機音檔' }]
const orderedLines = computed(() => project.value.lines)
const timedLines = computed(() => updateDerivedEndTimes(project.value.lines).filter(isTimedLine))
const activePlaybackLine = computed(() => timedLines.value.find((line) => playheadMs.value >= line.startMs && playheadMs.value <= line.endMs))
const isPlaying = computed(() => fakePlaying.value || media.isPlaying.value)
const durationMs = computed(() => Math.max(Math.max(0, ...timedLines.value.map((line) => line.endMs)), media.durationMs.value, 1000))
const exportText = computed(() => exportFormat.value === 'lrc' ? buildLrc(project.value.lines, project.value.metadata) : buildSrt(project.value.lines))
const activeStampLabel = computed(() => {
  if (stampMode.value === 'lrc') return '記錄時間'
  const activeLine = project.value.lines.find((line) => line.id === project.value.activeLineId)
  return activeLine?.startMs !== null && activeLine?.endMs === null ? '記錄結束' : '記錄開始'
})

const showStatus = (message: string) => { statusMessage.value = message }
const recordHistory = (before = cloneLines(project.value.lines)) => { undoStack.value.push(cloneLines(before)); redoStack.value = [] }
const undo = () => { const previous = undoStack.value.pop(); if (!previous) return; redoStack.value.push(cloneLines(project.value.lines)); project.value.lines = cloneLines(previous); selectionIds.value = new Set(); showStatus('已復原上一個編輯') }
const redo = () => { const next = redoStack.value.pop(); if (!next) return; undoStack.value.push(cloneLines(project.value.lines)); project.value.lines = cloneLines(next); selectionIds.value = new Set(); showStatus('已重做編輯') }
const switchTab = (tab: Tab) => { if (currentTab.value === 'edit' && tab !== 'edit') syncEditorTextToProject(); if (tab === 'edit') editableText.value = buildSrt(project.value.lines); currentTab.value = tab }
const syncEditorTextToProject = () => { const parsed = parseLyrics(editableText.value); const oldMetadata = project.value.metadata; project.value.lines = parsed.lines; project.value.metadata = parsed.format === 'lrc' ? parsed.metadata : { ...oldMetadata }; project.value.activeLineId = parsed.lines[0]?.id ?? null; selectionIds.value = new Set(parsed.lines[0] ? [parsed.lines[0].id] : []) }
const getLine = (id: string) => project.value.lines.find((line) => line.id === id)
const selectLine = (line: LyricLine) => { project.value.activeLineId = line.id; selectionIds.value = new Set([line.id]) }
const isLinePlaying = (line: LyricLine) => line.startMs !== null && line.endMs !== null && playheadMs.value >= line.startMs && playheadMs.value < line.endMs
const updateLineStart = (id: string, value: string) => { const line = getLine(id); if (!line) return; recordHistory(); if (!value.trim()) { line.startMs = null; line.endMs = null; return }; const start = Number(value) * 1000; if (!Number.isFinite(start)) return; line.startMs = Math.max(0, Math.round(start)); line.endMs = Math.max(line.startMs + 300, line.endMs ?? line.startMs + 3000) }
const updateLineEnd = (id: string, value: string) => { const line = getLine(id); if (!line || line.startMs === null) return; recordHistory(); const end = Number(value) * 1000; line.endMs = Number.isFinite(end) ? Math.max(line.startMs + 300, Math.round(end)) : line.startMs + 3000 }
const textSnapshots = new Map<string, LyricLine[]>()
const beginTextEdit = (id: string) => { if (!textSnapshots.has(id)) textSnapshots.set(id, cloneLines(project.value.lines)) }
const updateLineText = (id: string, event: Event) => { const line = getLine(id); if (line) line.text = (event.target as HTMLTextAreaElement).value }
const finishTextEdit = (id: string) => { const before = textSnapshots.get(id); if (before && JSON.stringify(before) !== JSON.stringify(project.value.lines)) recordHistory(before); textSnapshots.delete(id) }
const stampButtonLabel = (line: LyricLine) => stampMode.value === 'lrc' ? '打點' : line.startMs !== null && line.endMs === null ? '結束' : '開始'
const stampLine = (id: string): 'point' | 'start' | 'end' | null => {
  const line = getLine(id)
  if (!line) return null
  recordHistory()
  const currentMs = Math.max(0, Math.round(playheadMs.value / 10) * 10)
  let result: 'point' | 'start' | 'end'
  if (stampMode.value === 'lrc') {
    line.startMs = currentMs
    line.endMs = null
    result = 'point'
  } else if (line.startMs === null || line.endMs !== null) {
    line.startMs = currentMs
    line.endMs = null
    result = 'start'
  } else {
    line.endMs = Math.max(line.startMs + 300, currentMs)
    result = 'end'
  }
  project.value.activeLineId = id
  selectionIds.value = new Set([id])
  return result
}
const stampActiveLine = () => {
  const lineIndex = project.value.lines.findIndex((line) => line.id === project.value.activeLineId)
  const targetIndex = lineIndex >= 0 ? lineIndex : 0
  const target = project.value.lines[targetIndex]
  if (!target) return
  const result = stampLine(target.id)
  if ((result === 'point' || result === 'end') && project.value.lines[targetIndex + 1]) {
    project.value.activeLineId = project.value.lines[targetIndex + 1].id
  }
}
const clearLineStamp = (id: string) => { const line = getLine(id); if (!line || line.startMs === null) return; recordHistory(); line.startMs = null; line.endMs = null; showStatus('已清除該行時間') }
const resetTimestamps = () => { if (!project.value.lines.some((line) => line.startMs !== null) || !window.confirm('確定要清除所有歌詞時間嗎？')) return; recordHistory(); project.value.lines = project.value.lines.map((line) => ({ ...line, startMs: null, endMs: null })); project.value.activeLineId = project.value.lines[0]?.id ?? null; showStatus('已重設所有時間') }
const clearLyrics = () => { if (!window.confirm('確定要清空目前歌詞嗎？')) return; recordHistory(); project.value.lines = []; project.value.metadata = { title: '', artist: '', album: '' }; project.value.activeLineId = null; editableText.value = ''; showStatus('已清空歌詞') }
const onTimelineLinesUpdate = (lines: LyricLine[]) => { project.value.lines = cloneLines(lines); if (!project.value.lines.some((line) => line.id === project.value.activeLineId)) project.value.activeLineId = project.value.lines[0]?.id ?? null; const ids = new Set(lines.map((line) => line.id)); selectionIds.value = new Set([...selectionIds.value].filter((id) => ids.has(id))) }
const setPlayhead = (value: number) => { playheadMs.value = Math.max(0, Math.min(Math.round(value), durationMs.value)); if (media.mode.value !== 'none') media.seek(playheadMs.value) }
const startFake = () => { if (fakePlaying.value) return; fakePlaying.value = true; fakeLastTs = 0; fakeRaf = requestAnimationFrame(tickFake) }
const tickFake = (ts: number) => { if (!fakePlaying.value) return; if (!fakeLastTs) fakeLastTs = ts; playheadMs.value += ts - fakeLastTs; fakeLastTs = ts; if (playheadMs.value >= durationMs.value) { playheadMs.value = durationMs.value; stopFake(); return }; fakeRaf = requestAnimationFrame(tickFake) }
const stopFake = () => { fakePlaying.value = false; fakeLastTs = 0; if (fakeRaf) cancelAnimationFrame(fakeRaf); fakeRaf = 0 }
const togglePlayback = async () => { if (media.mode.value === 'none') { fakePlaying.value ? stopFake() : startFake(); return }; if (media.mode.value === 'youtube' && !media.youtubeVideoId.value) { showStatus('請先載入 YouTube 影片'); return }; if (media.mode.value === 'local' && !audioRef.value?.src) { showStatus('請先選擇本機音檔'); return }; await media.toggle() }
const stopPlayback = () => { stopFake(); media.stop(); playheadMs.value = 0 }
const seekTo = (value: number) => setPlayhead(value)
const skipPlayback = (seconds: number) => seekTo(playheadMs.value + seconds * 1000)
const adjustPlaybackRate = (delta: number) => { project.value.playbackRate = Math.max(0.5, Math.min(2, Math.round((project.value.playbackRate + delta) * 10) / 10)); media.setPlaybackRate(project.value.playbackRate) }
const selectMediaMode = (mode: MediaMode) => { stopPlayback(); media.setMode(mode); if (mode === 'none') showStatus('已切換為無媒體模式') }
const extractYouTubeId = (value: string) => { const url = value.trim(); const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/); const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/); const embed = url.match(/\/embed\/([a-zA-Z0-9_-]{6,})/); return short?.[1] ?? watch?.[1] ?? embed?.[1] ?? (/^[a-zA-Z0-9_-]{6,}$/.test(url) ? url : '') }
const loadYouTubeVideo = async () => { const id = extractYouTubeId(youtubeInput.value); if (!id) { showStatus('請輸入有效的 YouTube 網址'); return }; media.setMode('youtube'); media.youtubeVideoId.value = id; await nextTick(); media.youtubeElement.value = youtubeMount.value; if (await media.loadYouTube(youtubeInput.value)) showStatus('YouTube 影片已載入') }
const handleAudioUpload = (event: Event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; localFileName.value = file.name; media.loadLocalFile(file); showStatus('已載入 ' + file.name) }
const handleImportFile = async (event: Event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) importText.value = await file.text() }
const applyImport = () => { const content = importText.value.trim(); if (!content) return; const parsed = parseLyrics(content); recordHistory(); project.value.lines = parsed.lines; if (parsed.format === 'lrc') project.value.metadata = parsed.metadata; project.value.activeLineId = parsed.lines[0]?.id ?? null; editableText.value = buildSrt(project.value.lines); importVisible.value = false; showStatus('已匯入 ' + parsed.lines.length + ' 行歌詞') }
const openExport = () => { if (currentTab.value === 'edit') syncEditorTextToProject(); exportVisible.value = true }
const copyExport = async () => { try { await navigator.clipboard.writeText(exportText.value); showStatus('已複製匯出內容') } catch { showStatus('無法存取剪貼簿，請直接選取文字複製') } }
const downloadExport = () => { const blob = new Blob([exportText.value], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = (project.value.metadata.title.trim() || 'lyrics') + '.' + exportFormat.value; link.click(); URL.revokeObjectURL(url); showStatus('已下載 ' + link.download) }
const onGlobalKeydown = (event: KeyboardEvent) => { if (currentTab.value !== 'sync' || syncView.value !== 'list') return; const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase(); if (tag === 'input' || tag === 'textarea') return; if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') { event.preventDefault(); event.shiftKey ? redo() : undo(); return } else if (event.code === 'Space') { event.preventDefault(); event.shiftKey ? togglePlayback() : stampActiveLine() } else if (event.code === 'Enter') { event.preventDefault(); if (project.value.activeLineId) clearLineStamp(project.value.activeLineId) } else if (event.code === 'ArrowUp' || event.code === 'ArrowDown') { event.preventDefault(); const index = orderedLines.value.findIndex((line) => line.id === project.value.activeLineId); const next = orderedLines.value[Math.max(0, Math.min(index + (event.code === 'ArrowUp' ? -1 : 1), orderedLines.value.length - 1))]; if (next) { project.value.activeLineId = next.id; document.getElementById('sync-line-' + next.id)?.scrollIntoView({ block: 'nearest' }) } } }
watch(project, () => { saveState.value = 'saving'; saveProject(project.value); window.setTimeout(() => { saveState.value = 'saved' }, 180) }, { deep: true })
watch(() => media.currentTimeMs.value, (value) => { if (media.mode.value !== 'none') playheadMs.value = value })
watch(() => media.isPlaying.value, (playing) => { if (playing) stopFake() })
watch(() => project.value.playbackRate, (rate) => media.setPlaybackRate(rate), { immediate: true })
watch(() => activePlaybackLine.value?.id, async (id) => {
  if (!id || currentTab.value !== 'preview') return
  await nextTick()
  document.getElementById('preview-line-' + id)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
})
watch(audioRef, (element) => media.attachAudio(element), { immediate: true })
onMounted(() => { undoStack.value.push(cloneLines(project.value.lines)); window.addEventListener('keydown', onGlobalKeydown) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onGlobalKeydown); stopFake() })
</script>
