<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳至主要內容</a>
    <header class="lx-header">
      <div class="lx-brand">
        <svg class="lx-brand-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
        </svg>
        <span class="lx-brand-divider"></span>
        <div>
          <h1 class="lx-brand-title">Lyric Sync Editor</h1>
          <div class="lx-brand-sub">歌詞同步編輯器 · 製作精準的 LRC / SRT 字幕</div>
        </div>
      </div>
      <div class="lx-header-actions">
        <button
          class="btn btn-secondary"
          type="button"
          title="支援 .lrc, .srt, .txt"
          @click="importVisible = true"
        >
          <FileInput :size="16" />匯入檔案
        </button>
        <button class="btn btn-primary" type="button" @click="openExport">
          <Download :size="16" />匯出
        </button>
        <button
          class="btn-icon"
          type="button"
          title="使用說明"
          aria-label="使用說明"
          @click="shortcutsVisible = true"
        >
          <CircleHelp :size="17" />
        </button>
      </div>
    </header>

    <main id="main-content" class="lx-main">
      <section class="col" aria-label="媒體與歌曲設定">
        <MediaSourcePanel :media="media" @select-mode="selectMediaMode" @status="showStatus" />

        <section class="card">
          <h3 class="card-title">設定與操作</h3>
          <div class="col-gap">
            <span class="label">歌曲資訊 · Metadata</span
            ><input
              id="meta-title"
              v-model="project.metadata.title"
              class="input"
              type="text"
              placeholder="歌曲名稱 (ti)"
            /><input
              id="meta-artist"
              v-model="project.metadata.artist"
              class="input"
              type="text"
              placeholder="歌手 / 演出者 (ar)"
            /><input
              id="meta-album"
              v-model="project.metadata.album"
              class="input"
              type="text"
              placeholder="專輯名稱 (al)"
            />
          </div>
          <div class="hint-block">
            <div class="hint-title"><Keyboard :size="14" />同步模式快捷鍵</div>
            <div class="hint-row">
              <span><kbd>Space</kbd></span
              ><span class="lbl">打上時間並跳至下一行</span>
            </div>
            <div class="hint-row">
              <span><kbd>Shift</kbd><kbd>Space</kbd></span
              ><span class="lbl">播放 / 暫停</span>
            </div>
            <div class="hint-row">
              <span><kbd>Enter</kbd></span
              ><span class="lbl">清除當前行時間</span>
            </div>
            <div class="hint-row">
              <span><kbd>↑ ↓</kbd></span
              ><span class="lbl">切換選取行</span>
            </div>
          </div>
        </section>
      </section>

      <section class="col">
        <nav class="tabs" aria-label="編輯步驟">
          <div class="tab-list" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="tab"
              :class="{ 'is-active': currentTab === tab.value }"
              type="button"
              role="tab"
              :aria-selected="currentTab === tab.value"
              @click="switchTab(tab.value)"
            >
              <span class="tab-num">{{ Number(tab.number) }}</span
              >{{ tab.label }}
            </button>
          </div>
          <div class="time-display" :class="{ 'is-playing': isPlaying }">
            <span class="dot"></span
            ><span
              >時間 <strong>{{ formatClock(playheadMs) }}</strong></span
            >
          </div>
        </nav>

        <section v-if="currentTab === 'edit'" class="panel-body">
          <div class="panel-toprow">
            <span>直接輸入或貼上歌詞 · 系統會自動辨識 LRC / SRT 並轉換時間軸</span
            ><button class="danger-link" type="button" @click="clearLyrics">⌫ 清空歌詞</button>
          </div>
          <div
            class="textarea-drop-target"
            @dragenter.prevent="isLyricsDragOver = true"
            @dragover.prevent="isLyricsDragOver = true"
            @dragleave.prevent="isLyricsDragOver = false"
            @drop.prevent="onLyricsDrop"
          >
            <textarea
              v-model="editableText"
              class="textarea"
              spellcheck="false"
              placeholder="在此處輸入或貼上歌詞…&#10;&#10;例：&#10;第一行歌詞&#10;第二行歌詞&#10;&#10;支援 LRC 或 SRT 字幕，系統會自動轉換時間軸&#10;也可以直接拖入文字檔"
            ></textarea>
            <div v-if="isLyricsDragOver" class="drop-zone lyrics-drop-overlay">
              <span class="drop-icon">↥</span>
              <strong>放開以匯入 LRC、SRT 或 TXT</strong>
              <span>拖放歌詞檔案到這裡</span>
            </div>
          </div>
        </section>

        <section v-else-if="currentTab === 'sync'" class="panel-body">
          <div class="sync-view-guidance">
            <span class="sync-view-copy">用時間軸微調區段起訖，或切換列表逐行打點。</span>
            <div class="sync-setting-row">
              <div class="sync-mode-switch">
                <span class="sync-mode-label">同步方式</span>
                <div class="view-switch" role="tablist" aria-label="同步方式">
                  <button
                    class="view-switch-button"
                    :class="{ 'is-active': syncView === 'timeline' }"
                    type="button"
                    @click="syncView = 'timeline'"
                  >
                    <SlidersHorizontal :size="14" />時間軸微調</button
                  ><button
                    class="view-switch-button"
                    :class="{ 'is-active': syncView === 'list' }"
                    type="button"
                    @click="syncView = 'list'"
                  >
                    <List :size="14" />列表打點
                  </button>
                </div>
              </div>
              <div v-if="syncView === 'list'" class="sync-mode-switch">
                <span class="sync-mode-label">打點格式</span>
                <div class="view-switch" role="tablist" aria-label="打點格式">
                  <button
                    class="view-switch-button"
                    :class="{ 'is-active': stampMode === 'lrc' }"
                    type="button"
                    role="tab"
                    :aria-selected="stampMode === 'lrc'"
                    @click="stampMode = 'lrc'"
                  >
                    LRC 單點</button
                  ><button
                    class="view-switch-button"
                    :class="{ 'is-active': stampMode === 'srt' }"
                    type="button"
                    role="tab"
                    :aria-selected="stampMode === 'srt'"
                    @click="stampMode = 'srt'"
                  >
                    SRT 區間
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="current-lyric" :class="{ 'has-lyric': activePlaybackLine }">
            <strong>{{ activePlaybackLine?.text || '尚未播放到歌詞' }}</strong>
          </div>
          <div class="sync-playback-bar">
            <div class="player-cluster">
              <button
                class="play-btn"
                type="button"
                :aria-label="isPlaying ? '暫停' : '播放'"
                @click="togglePlayback"
              >
                <Pause v-if="isPlaying" :size="15" fill="currentColor" /><Play
                  v-else
                  :size="15"
                  fill="currentColor"
                />
              </button>
              <div class="speed-pill">
                <button type="button" @click="adjustPlaybackRate(-0.1)">−</button
                ><span class="indicator">{{ project.playbackRate.toFixed(1) }}×</span
                ><button type="button" @click="adjustPlaybackRate(0.1)">＋</button>
              </div>
              <span class="sync-time">{{ formatClock(playheadMs) }}</span>
            </div>
            <div v-if="syncView === 'list'" class="timeline-toolbar-group timeline-actions">
              <button class="btn btn-quiet btn-sm" type="button" @click="resetTimestamps">
                重設所有時間
              </button>
              <button
                class="btn btn-primary sync-stamp-button"
                type="button"
                @click="stampActiveLine"
              >
                <CircleDot :size="15" />{{ activeStampLabel }} · Space
              </button>
            </div>
            <div v-else class="timeline-toolbar-group timeline-actions">
              <button
                class="btn btn-quiet btn-sm"
                type="button"
                @click="timelineEditorRef?.resolveOverlaps()"
              >
                整理重疊
              </button>
              <button
                class="btn btn-quiet btn-sm"
                type="button"
                :aria-pressed="autoFollow"
                @click="autoFollow = !autoFollow"
              >
                跟隨：{{ autoFollow ? '開' : '關' }}
              </button>
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
          <TimelineEditor
            v-else
            ref="timelineEditorRef"
            :lines="project.lines"
            :playhead-ms="playheadMs"
            :selection-ids="selectionIds"
            :is-playing="isPlaying"
            :auto-follow="autoFollow"
            :media-duration-ms="durationMs"
            :zoom-level="zoomLevel"
            @update:lines="onTimelineLinesUpdate"
            @update:playhead-ms="setPlayhead"
            @update:selection-ids="selectionIds = new Set($event)"
            @update:auto-follow="autoFollow = $event"
            @update:zoom-level="zoomLevel = $event"
            @history="recordHistory($event)"
            @undo="undo"
            @redo="redo"
            @toggle-play="togglePlayback"
            @stop-play="stopPlayback"
          />
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
    <footer class="lx-footer">
      © 2026 Lyric Sync Editor <span class="dot">·</span> 免安裝 · 無廣告 · 支援 LRC / SRT 格式
    </footer>

    <ImportModal v-model:visible="importVisible" @import="onImportSubmit" />
    <ExportModal
      v-model:visible="exportVisible"
      v-model:format="exportFormat"
      :text="exportText"
      @copy="copyExport"
      @copy-error="copyExportError"
      @download="downloadExport"
    />
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
import {
  CircleDot,
  CircleHelp,
  Download,
  FileInput,
  Keyboard,
  List,
  Pause,
  Play,
  SlidersHorizontal,
} from '@lucide/vue'
import {
  buildLrc,
  buildSrt,
  formatClock,
  isTimedLine,
  parseLyrics,
  updateDerivedEndTimes,
} from './utils/lyric-format'
import { loadProject, saveProject } from './utils/storage'
import {
  cloneLines,
  createProject,
  type ExportFormat,
  type LyricLine,
  type MediaMode,
  type Project,
} from './types'

type Tab = 'edit' | 'sync' | 'preview'
type SyncView = 'list' | 'timeline'
type StampMode = 'lrc' | 'srt'
const DEFAULT_LYRICS =
  '1\n00:00:01,500 --> 00:00:05,200\n歡迎使用歌詞同步編輯器\n\n2\n00:00:05,200 --> 00:00:09,800\n在列表中按下空白鍵開始打點\n\n3\n00:00:09,800 --> 00:00:14,000\n切換時間軸可以調整歌詞區段\n\n4\n00:00:14,000 --> 00:00:18,500\n也可以貼上 YouTube 或載入本機音檔\n\n5\n00:00:18,500 --> 00:00:21,500\n完成後匯出 SRT 或 LRC'
const initialProject = (): Project => {
  const saved = loadProject()
  if (saved) return saved
  const parsed = parseLyrics(DEFAULT_LYRICS)
  const next = createProject(parsed.lines)
  next.metadata = parsed.metadata
  return next
}
const project = ref<Project>(initialProject())
const currentTab = ref<Tab>('edit')
const syncView = ref<SyncView>('timeline')
const stampMode = ref<StampMode>('lrc')
const editableText = ref(buildSrt(project.value.lines))
const isLyricsDragOver = ref(false)
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
const tabs = [
  { value: 'edit' as Tab, number: '01', label: '編輯歌詞文字' },
  { value: 'sync' as Tab, number: '02', label: '製作時間同步' },
  { value: 'preview' as Tab, number: '03', label: '動態歌詞預覽' },
]
const orderedLines = computed(() => project.value.lines)
const timedLines = computed(() => updateDerivedEndTimes(project.value.lines).filter(isTimedLine))
const activePlaybackLine = computed(() =>
  timedLines.value.find(
    (line) => playheadMs.value >= line.startMs && playheadMs.value <= line.endMs,
  ),
)
const isPlaying = computed(() => fakePlaying.value || media.isPlaying.value)
const durationMs = computed(() =>
  Math.max(
    Math.max(0, ...timedLines.value.map((line) => line.endMs)),
    media.durationMs.value,
    1000,
  ),
)
const exportText = computed(() =>
  exportFormat.value === 'lrc'
    ? buildLrc(project.value.lines, project.value.metadata)
    : buildSrt(project.value.lines),
)
const activeStampLabel = computed(() => {
  if (stampMode.value === 'lrc') return '記錄時間'
  const activeLine = project.value.lines.find((line) => line.id === project.value.activeLineId)
  return activeLine?.startMs !== null && activeLine?.endMs === null ? '記錄結束' : '記錄開始'
})

const showStatus = (message: string) => {
  statusMessage.value = message
}
const recordHistory = (before = cloneLines(project.value.lines)) => {
  undoStack.value.push(cloneLines(before))
  redoStack.value = []
}
const undo = () => {
  const previous = undoStack.value.pop()
  if (!previous) return
  redoStack.value.push(cloneLines(project.value.lines))
  project.value.lines = cloneLines(previous)
  selectionIds.value = new Set()
  showStatus('已復原上一個編輯')
}
const redo = () => {
  const next = redoStack.value.pop()
  if (!next) return
  undoStack.value.push(cloneLines(project.value.lines))
  project.value.lines = cloneLines(next)
  selectionIds.value = new Set()
  showStatus('已重做編輯')
}
const switchTab = (tab: Tab) => {
  if (currentTab.value === 'edit' && tab !== 'edit') syncEditorTextToProject()
  if (tab === 'edit') editableText.value = buildSrt(project.value.lines)
  currentTab.value = tab
}
const syncEditorTextToProject = () => {
  const parsed = parseLyrics(editableText.value)
  const oldMetadata = project.value.metadata
  project.value.lines = parsed.lines
  project.value.metadata = parsed.format === 'lrc' ? parsed.metadata : { ...oldMetadata }
  project.value.activeLineId = parsed.lines[0]?.id ?? null
  selectionIds.value = new Set(parsed.lines[0] ? [parsed.lines[0].id] : [])
}
const getLine = (id: string) => project.value.lines.find((line) => line.id === id)
const selectLine = (line: LyricLine) => {
  project.value.activeLineId = line.id
  selectionIds.value = new Set([line.id])
}
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
const clearLineStamp = (id: string) => {
  const line = getLine(id)
  if (!line || line.startMs === null) return
  recordHistory()
  line.startMs = null
  line.endMs = null
  showStatus('已清除該行時間')
}
const resetTimestamps = () => {
  if (
    !project.value.lines.some((line) => line.startMs !== null) ||
    !window.confirm('確定要清除所有歌詞時間嗎？')
  )
    return
  recordHistory()
  project.value.lines = project.value.lines.map((line) => ({ ...line, startMs: null, endMs: null }))
  project.value.activeLineId = project.value.lines[0]?.id ?? null
  showStatus('已重設所有時間')
}
const onLyricsDrop = async (event: DragEvent) => {
  isLyricsDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  editableText.value = await file.text()
  showStatus('已載入 ' + file.name)
}
const clearLyrics = () => {
  if (!window.confirm('確定要清空目前歌詞嗎？')) return
  recordHistory()
  project.value.lines = []
  project.value.metadata = { title: '', artist: '', album: '' }
  project.value.activeLineId = null
  editableText.value = ''
  showStatus('已清空歌詞')
}
const onTimelineLinesUpdate = (lines: LyricLine[]) => {
  project.value.lines = cloneLines(lines)
  if (!project.value.lines.some((line) => line.id === project.value.activeLineId))
    project.value.activeLineId = project.value.lines[0]?.id ?? null
  const ids = new Set(lines.map((line) => line.id))
  selectionIds.value = new Set([...selectionIds.value].filter((id) => ids.has(id)))
}
const setPlayhead = (value: number) => {
  playheadMs.value = Math.max(0, Math.min(Math.round(value), durationMs.value))
  if (media.mode.value !== 'none') media.seek(playheadMs.value)
}
const startFake = () => {
  if (fakePlaying.value) return
  fakePlaying.value = true
  fakeLastTs = 0
  fakeRaf = requestAnimationFrame(tickFake)
}
const tickFake = (ts: number) => {
  if (!fakePlaying.value) return
  if (!fakeLastTs) fakeLastTs = ts
  playheadMs.value += ts - fakeLastTs
  fakeLastTs = ts
  if (playheadMs.value >= durationMs.value) {
    playheadMs.value = durationMs.value
    stopFake()
    return
  }
  fakeRaf = requestAnimationFrame(tickFake)
}
const stopFake = () => {
  fakePlaying.value = false
  fakeLastTs = 0
  if (fakeRaf) cancelAnimationFrame(fakeRaf)
  fakeRaf = 0
}
const togglePlayback = async () => {
  if (media.mode.value === 'none') {
    fakePlaying.value ? stopFake() : startFake()
    return
  }
  if (media.mode.value === 'youtube' && !media.youtubeVideoId.value) {
    showStatus('請先載入 YouTube 影片')
    return
  }
  if (media.mode.value === 'local' && !media.audioElement.value?.src) {
    showStatus('請先選擇本機音檔')
    return
  }
  await media.toggle()
}
const stopPlayback = () => {
  stopFake()
  media.stop()
  playheadMs.value = 0
}
const seekTo = (value: number) => setPlayhead(value)
const skipPlayback = (seconds: number) => seekTo(playheadMs.value + seconds * 1000)
const adjustPlaybackRate = (delta: number) => {
  project.value.playbackRate = Math.max(
    0.5,
    Math.min(2, Math.round((project.value.playbackRate + delta) * 10) / 10),
  )
  media.setPlaybackRate(project.value.playbackRate)
}
const selectMediaMode = (mode: MediaMode) => {
  stopPlayback()
  media.setMode(mode)
}
const onImportSubmit = (content: string) => {
  const parsed = parseLyrics(content)
  recordHistory()
  project.value.lines = parsed.lines
  if (parsed.format === 'lrc') project.value.metadata = parsed.metadata
  project.value.activeLineId = parsed.lines[0]?.id ?? null
  editableText.value = buildSrt(project.value.lines)
  showStatus('已匯入 ' + parsed.lines.length + ' 行歌詞')
}
const openExport = () => {
  if (currentTab.value === 'edit') syncEditorTextToProject()
  exportVisible.value = true
}
const copyExport = () => showStatus('已複製匯出內容')
const copyExportError = () => showStatus('無法存取剪貼簿，請直接選取文字複製')
const downloadExport = () => {
  const blob = new Blob([exportText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = (project.value.metadata.title.trim() || 'lyrics') + '.' + exportFormat.value
  link.click()
  URL.revokeObjectURL(url)
  showStatus('已下載 ' + link.download)
}
const onGlobalKeydown = (event: KeyboardEvent) => {
  if (currentTab.value !== 'sync' || syncView.value !== 'list') return
  const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea') return
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
    return
  } else if (event.code === 'Space') {
    event.preventDefault()
    event.shiftKey ? togglePlayback() : stampActiveLine()
  } else if (event.code === 'Enter') {
    event.preventDefault()
    if (project.value.activeLineId) clearLineStamp(project.value.activeLineId)
  } else if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
    event.preventDefault()
    const index = orderedLines.value.findIndex((line) => line.id === project.value.activeLineId)
    const next =
      orderedLines.value[
        Math.max(
          0,
          Math.min(index + (event.code === 'ArrowUp' ? -1 : 1), orderedLines.value.length - 1),
        )
      ]
    if (next) {
      project.value.activeLineId = next.id
      document.getElementById('sync-line-' + next.id)?.scrollIntoView({ block: 'nearest' })
    }
  }
}
watch(
  project,
  () => {
    saveState.value = 'saving'
    saveProject(project.value)
    window.setTimeout(() => {
      saveState.value = 'saved'
    }, 180)
  },
  { deep: true },
)
watch(
  () => media.currentTimeMs.value,
  (value) => {
    if (media.mode.value !== 'none') playheadMs.value = value
  },
)
watch(
  () => media.isPlaying.value,
  (playing) => {
    if (playing) stopFake()
  },
)
watch(
  () => project.value.playbackRate,
  (rate) => media.setPlaybackRate(rate),
  { immediate: true },
)
watch(
  () => activePlaybackLine.value?.id,
  async (id) => {
    if (!id || currentTab.value !== 'preview') return
    await nextTick()
    document
      .getElementById('preview-line-' + id)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
)
onMounted(() => {
  undoStack.value.push(cloneLines(project.value.lines))
  window.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  stopFake()
})
</script>

<style scoped>
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--lx-ink-25);
}

.skip-link {
  position: fixed;
  z-index: 100;
  top: -50px;
  left: 16px;
  padding: 8px;
  background: var(--navy-dark);
  color: #fff;
}

.skip-link:focus {
  top: 12px;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 12px;
}

.view-switch {
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--soft);
}

.view-switch-button {
  flex: 1;
  min-height: 29px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
}

.view-switch-button.is-active {
  background: #fff;
  color: var(--navy-dark);
  box-shadow: 0 1px 3px rgba(17, 33, 75, 0.1);
}

.timeline-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-quiet {
  min-height: 30px;
  padding: 5px 8px;
  border: 0;
  background: var(--soft);
  color: var(--muted);
  font-size: 11px;
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--subtle);
  font-size: 11px;
}

.zoom-control input {
  width: 100px;
  accent-color: var(--violet);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-2);
}

.skip-link {
  position: fixed;
  z-index: 100;
  top: -50px;
  left: 16px;
  padding: 8px;
  background: var(--lx-navy-800);
  color: #fff;
}

.skip-link:focus {
  top: 12px;
}

.lx-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-6);
  border-bottom: 1px solid var(--border-1);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.lx-brand {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.lx-brand-icon {
  width: 28px;
  height: 28px;
  flex: none;
  fill: none;
  stroke: var(--lx-navy-500);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
}

.lx-brand-divider {
  width: 1px;
  height: 22px;
  background: var(--border-1);
}

.lx-brand-title {
  margin: 0;
  color: var(--lx-navy-800);
  font-size: var(--fs-14);
  font-weight: 600;
  letter-spacing: var(--tracking-snug);
}

.lx-brand-sub {
  margin-top: 1px;
  color: var(--fg-3);
  font-size: var(--fs-12);
}

.lx-header-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.btn-sm {
  padding: 6px 10px;
  font-size: var(--fs-12);
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-1);
  border-radius: var(--r-2);
  background: #fff;
  color: var(--fg-2);
}

.btn-icon:hover {
  border-color: var(--lx-ink-300);
  color: var(--lx-navy-700);
}

.lx-main {
  width: 100%;
  max-width: 1680px;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sp-6);
  margin: 0 auto;
  padding: var(--sp-6);
}

.col {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-2);
  background: #fff;
  color: var(--fg-1);
  font-size: var(--fs-14);
  transition:
    border-color var(--dur-1) var(--ease-out),
    box-shadow var(--dur-1) var(--ease-out);
}

.textarea::placeholder {
  color: var(--fg-3);
}

.textarea:focus {
  outline: none;
  border-color: var(--lx-navy-500);
  box-shadow: var(--ring-focus);
}

.textarea {
  min-height: 420px;
  resize: none;
  font-family: var(--font-mono);
  font-size: var(--fs-13);
  line-height: 1.75;
}

.textarea-drop-target {
  position: relative;
  width: 100%;
}

.lyrics-drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  justify-content: center;
  background: var(--bg-2);
  cursor: default;
  pointer-events: none;
}

.label {
  display: block;
  margin-bottom: 6px;
  color: var(--fg-2);
  font-size: var(--fs-12);
  font-weight: 400;
}

.hint-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--border-1);
  border-radius: var(--r-2);
  background: var(--bg-3);
}

.hint-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  color: var(--lx-navy-800);
  font-size: var(--fs-12);
  font-weight: 600;
}

.hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--fg-2);
  font-size: var(--fs-12);
}

.hint-row kbd {
  padding: 1px 6px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-1);
  background: #fff;
  color: var(--lx-navy-700);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
}

.hint-row .lbl {
  color: var(--fg-1);
  font-weight: 500;
}

.tabs {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-4);
  border-bottom: 1px solid var(--border-1);
}

.tab-list {
  display: flex;
  gap: 4px;
}

.tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: -1px;
  padding: 12px 16px;
  border-bottom: 2px solid transparent;
  color: var(--fg-2);
  font-size: var(--fs-14);
  font-weight: 500;
  transition:
    color var(--dur-1) var(--ease-out),
    border-color var(--dur-1) var(--ease-out);
}

.tab:hover {
  color: var(--lx-navy-700);
}

.tab.is-active {
  border-bottom-color: var(--lx-navy-500);
  color: var(--lx-navy-800);
  font-weight: 600;
}

.tab-num {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-1);
  background: var(--bg-3);
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
}

.tab.is-active .tab-num {
  background: var(--lx-navy-500);
  color: #fff;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: var(--fs-13);
}

.time-display .dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--lx-ink-300);
}

.time-display.is-playing .dot {
  background: var(--lx-violet-500);
  box-shadow: 0 0 0 3px rgba(80, 64, 152, 0.18);
  animation: pulse 1.4s var(--ease-out) infinite;
}

.panel-body {
  min-height: 520px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border: 1px solid var(--border-1);
  border-radius: var(--r-3);
  background: #fff;
  box-shadow: var(--shadow-2);
}

.panel-toprow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  color: var(--fg-2);
  font-size: var(--fs-13);
}

.danger-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--lx-danger);
  font-size: var(--fs-12);
  transition: color var(--dur-1) var(--ease-out);
}

.danger-link:hover {
  color: #931f37;
}

.view-switch {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-2);
  background: var(--bg-3);
}

.view-switch button {
  min-width: 58px;
  padding: 5px 9px;
  border-radius: 3px;
  color: var(--fg-2);
  font-size: var(--fs-12);
}

.view-switch button.is-active {
  background: #fff;
  color: var(--lx-navy-800);
  box-shadow: var(--shadow-1);
}

.player-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
}

.speed-pill {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border-1);
  border-radius: var(--r-2);
  background: #fff;
}

.speed-pill button {
  padding: 6px 10px;
  color: var(--fg-2);
  font-size: var(--fs-12);
}

.speed-pill .indicator {
  min-width: 44px;
  padding: 6px 10px;
  border-right: 1px solid var(--border-1);
  border-left: 1px solid var(--border-1);
  color: var(--lx-navy-800);
  font-family: var(--font-mono);
  font-size: var(--fs-12);
  font-weight: 500;
  text-align: center;
}

.sync-time {
  color: var(--fg-2);
  font-family: var(--font-mono);
  font-size: var(--fs-12);
}

.lx-footer {
  margin-top: auto;
  padding: var(--sp-6);
  border-top: 1px solid var(--border-1);
  background: #fff;
  color: var(--fg-3);
  font-size: var(--fs-12);
  text-align: center;
}

.lx-footer .dot {
  color: var(--lx-violet-500);
}

.btn-icon svg {
  flex: none;
  stroke-width: 1.8;
}

.timeline-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-quiet {
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid var(--border-1);
  background: #fff;
  color: var(--fg-2);
  font-size: 11px;
  font-weight: 500;
  transition:
    border-color var(--dur-1) var(--ease-out),
    background var(--dur-1) var(--ease-out),
    color var(--dur-1) var(--ease-out);
}

.btn-quiet:hover {
  border-color: var(--lx-ink-300);
  background: var(--bg-3);
  color: var(--lx-navy-700);
}

.btn-quiet[aria-pressed='true'] {
  border-color: var(--lx-navy-500);
  background: var(--lx-violet-50);
  color: var(--lx-navy-800);
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--fg-3);
  font-size: 11px;
}

.zoom-control input {
  width: 100px;
  accent-color: var(--lx-violet-500);
}

.sync-view-guidance {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
  color: var(--fg-2);
  font-size: var(--fs-13);
}

.sync-setting-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.sync-mode-switch {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.sync-mode-label {
  color: var(--fg-3);
  font-size: var(--fs-12);
  font-weight: 500;
}

.sync-mode-switch .view-switch {
  padding: 2px;
}

.sync-mode-switch .view-switch button {
  min-width: 112px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 10px;
  white-space: nowrap;
}

.sync-playback-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-3);
  padding: 10px 12px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-3);
  background: var(--bg-2);
}

.current-lyric {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  text-align: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--border-1);
  border-radius: var(--r-2);
  background: #fff;
}

.current-lyric span {
  flex: none;
  color: var(--fg-3);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.current-lyric strong {
  min-width: 0;
  overflow: hidden;
  color: var(--fg-2);
  font-size: var(--fs-18);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-lyric.has-lyric {
  border-color: var(--lx-violet-200);
  background: var(--lx-violet-50);
}

.current-lyric.has-lyric strong {
  color: var(--lx-navy-800);
  font-weight: 700;
}

.timeline-actions {
  margin-left: auto;
}

.textarea,
.current-lyric strong {
  font-family: var(--font-lyrics);
}

.current-lyric {
  align-items: center;
}

@media (min-width: 1024px) {
  .lx-main {
    grid-template-columns: 420px minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .lx-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .lx-header-actions {
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  .lx-main {
    padding: var(--sp-3);
  }

  .tabs {
    align-items: stretch;
    flex-direction: column;
  }

  .tab-list {
    overflow-x: auto;
  }

  .tab {
    flex: none;
  }

  .time-display {
    padding-bottom: 8px;
  }

  .panel-toprow {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 760px) {
  .sync-playback-bar {
    justify-content: flex-start;
  }

  .sync-stamp-button {
    width: 100%;
  }
}
</style>
