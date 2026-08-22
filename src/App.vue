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
        <MediaSourcePanel :media="media" @select-mode="selectMediaMode" @status="showStatus" />

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
          <SyncListView
            v-if="syncView === 'list'"
            :lines="orderedLines"
            :active-line-id="project.activeLineId"
            :stamp-mode="stampMode"
            @select="selectLine"
            @clear-stamp="clearLineStamp"
            @stamp="stampLine"
          />
          <TimelineEditor v-else ref="timelineEditorRef" :lines="project.lines" :playhead-ms="playheadMs" :selection-ids="selectionIds" :is-playing="isPlaying" :auto-follow="autoFollow" :media-duration-ms="durationMs" :zoom-level="zoomLevel" @update:lines="onTimelineLinesUpdate" @update:playhead-ms="setPlayhead" @update:selection-ids="selectionIds = new Set($event)" @update:auto-follow="autoFollow = $event" @update:zoom-level="zoomLevel = $event" @history="recordHistory($event)" @undo="undo" @redo="redo" @toggle-play="togglePlayback" @stop-play="stopPlayback" />
        </section>

        <section v-else class="panel-body">
          <PreviewPanel
            :timed-lines="timedLines"
            :active-line-id="activePlaybackLine?.id ?? null"
            :playhead-ms="playheadMs"
            :is-playing="isPlaying"
            @toggle-play="togglePlayback"
            @skip="skipPlayback"
            @seek="seekTo"
          />
        </section>
      </section>
    </main>
    <footer class="lx-footer">© 2026 Lyric Sync Editor <span class="dot">·</span> 免安裝 · 無廣告 · 支援 LRC / SRT 格式</footer>

    <ImportModal v-model:visible="importVisible" @import="onImportSubmit" />
    <ExportModal v-model:visible="exportVisible" v-model:format="exportFormat" :text="exportText" @copy="copyExport" @download="downloadExport" />
    <ShortcutsModal v-model:visible="shortcutsVisible" />
    <div class="sr-only" aria-live="polite">{{ statusMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import TimelineEditor from './components/TimelineEditor.vue'
import MediaSourcePanel from './components/MediaSourcePanel.vue'
import SyncListView from './components/SyncListView.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ImportModal from './components/ImportModal.vue'
import ExportModal from './components/ExportModal.vue'
import ShortcutsModal from './components/ShortcutsModal.vue'
import { useMediaController } from './composables/useMediaController'
import { CircleDot, CircleHelp, Download, FileInput, Keyboard, List, Pause, Play, SlidersHorizontal } from '@lucide/vue'
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
const statusMessage = ref('')
const undoStack = ref<LyricLine[][]>([])
const redoStack = ref<LyricLine[][]>([])
let fakeRaf = 0
let fakeLastTs = 0
const media = useMediaController()
const tabs = [{ value: 'edit' as Tab, number: '01', label: '編輯歌詞文字' }, { value: 'sync' as Tab, number: '02', label: '製作時間同步' }, { value: 'preview' as Tab, number: '03', label: '動態歌詞預覽' }]
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
const togglePlayback = async () => { if (media.mode.value === 'none') { fakePlaying.value ? stopFake() : startFake(); return }; if (media.mode.value === 'youtube' && !media.youtubeVideoId.value) { showStatus('請先載入 YouTube 影片'); return }; if (media.mode.value === 'local' && !media.audioElement.value?.src) { showStatus('請先選擇本機音檔'); return }; await media.toggle() }
const stopPlayback = () => { stopFake(); media.stop(); playheadMs.value = 0 }
const seekTo = (value: number) => setPlayhead(value)
const skipPlayback = (seconds: number) => seekTo(playheadMs.value + seconds * 1000)
const adjustPlaybackRate = (delta: number) => { project.value.playbackRate = Math.max(0.5, Math.min(2, Math.round((project.value.playbackRate + delta) * 10) / 10)); media.setPlaybackRate(project.value.playbackRate) }
const selectMediaMode = (mode: MediaMode) => { stopPlayback(); media.setMode(mode); if (mode === 'none') showStatus('已切換為無媒體模式') }
const onImportSubmit = (content: string) => { const parsed = parseLyrics(content); recordHistory(); project.value.lines = parsed.lines; if (parsed.format === 'lrc') project.value.metadata = parsed.metadata; project.value.activeLineId = parsed.lines[0]?.id ?? null; editableText.value = buildSrt(project.value.lines); showStatus('已匯入 ' + parsed.lines.length + ' 行歌詞') }
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
onMounted(() => { undoStack.value.push(cloneLines(project.value.lines)); window.addEventListener('keydown', onGlobalKeydown) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onGlobalKeydown); stopFake() })
</script>
