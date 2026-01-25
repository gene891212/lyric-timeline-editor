<template>
  <a-layout class="app-shell">
    <a-layout-header class="topbar">
      <div class="brand">Lyric Timeline Editor</div>
      <div class="actions">
        <a-button size="small" type="primary" @click="exportVisible = true">Export</a-button>
      </div>
    </a-layout-header>
    <a-layout class="main">
      <a-layout-sider class="side left" :width="360">
        <div class="panel list-panel">
          <div class="panel-head">
            <h3>Lyrics</h3>
            <a-button size="small" type="primary" @click="importVisible = true">Import SRT/LRC</a-button>
          </div>
          <div class="youtube-input">
            <a-input v-model="youtubeUrl" size="small" placeholder="YouTube URL" />
            <a-button size="small" @click="loadYouTube">Load</a-button>
          </div>
          <div ref="lyricListRef" class="lyric-list">
            <div
              v-for="segment in orderedSegments"
              :key="segment.id"
              class="lyric-item"
              :class="{
                'is-playing': isSegmentPlaying(segment),
              }"
              :ref="setLyricItemRef(segment.id)"
              @click="selectSegmentFromList(segment)"
            >
              <div class="lyric-times">
                <a-input-number
                  :model-value="segment.start / 1000"
                  :min="0"
                  :step="0.01"
                  size="small"
                  @change="(value) => updateListStart(segment.id, value)"
                />
                <span class="time-sep">→</span>
                <a-input-number
                  :model-value="segment.end / 1000"
                  :min="0"
                  :step="0.01"
                  size="small"
                  @change="(value) => updateListEnd(segment.id, value)"
                />
                <div class="lyric-actions">
                  <a-button
                    size="small"
                    shape="circle"
                    :aria-label="'Play segment'"
                    @click.stop="playSegment(segment)"
                  >
                    <icon-play-arrow />
                  </a-button>
                  <a-button
                    size="small"
                    shape="circle"
                    status="danger"
                    :aria-label="'Delete segment'"
                    @click.stop="deleteSegment(segment.id)"
                  >
                    <icon-delete />
                  </a-button>
                </div>
              </div>
              <a-textarea
                :model-value="segment.text"
                :auto-size="{ minRows: 2, maxRows: 4 }"
                @change="(value) => updateListText(segment.id, value)"
              />
            </div>
          </div>
        </div>
      </a-layout-sider>
      <a-layout-content class="timeline-pane">
        <div v-if="youtubeVideoId" class="youtube-inline">
          <div id="youtube-player"></div>
        </div>
        <div class="current-lyric">
          {{ activePlayText || '—' }}
        </div>
        <div class="timeline-header">
          <div class="control-row">
            <div class="play-controls">
              <a-button size="small" type="primary" @click="togglePlay">
                {{ isPlaying ? 'Pause' : 'Play' }}
              </a-button>
              <a-button size="small" @click="stopPlay">Stop</a-button>
              <span class="play-time">{{ formatClock(playheadMs) }}</span>
              <span class="play-lyric">{{ activePlayText || '-' }}</span>
            </div>
            <div class="snap-controls">
              <a-button size="small" @click="resolveOverlaps">Resolve Overlap</a-button>
              <a-button size="small" @click="autoFollow = !autoFollow">
                {{ autoFollow ? 'Auto Follow: On' : 'Auto Follow: Off' }}
              </a-button>
            </div>
            <div class="zoom-controls">
              <span>Zoom</span>
              <a-slider
                v-model="zoomLevel"
                :min="5"
                :max="160"
                :step="5"
                :style="{ width: '160px' }"
              />
            </div>
          </div>
          <div
            ref="headerScrollRef"
            class="scale-scroll"
            @scroll="onHeaderScroll"
            @pointerdown="onHeaderPointerDown"
          >
            <div class="scale-track" :style="{ width: `${timelineWidth}px` }">
              <div
                v-for="tick in ticks"
                :key="tick"
                class="scale-tick"
                :class="{ major: tick % 1000 === 0 }"
                :style="{ left: `${tick * pxPerMs}px` }"
              >
                <span v-if="tick % 1000 === 0" class="scale-label">
                  {{ formatMark(tick) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div ref="timelineScrollRef" class="timeline-scroll" @scroll="onTimelineScroll">
          <div
            ref="trackRef"
            class="timeline-track"
            :style="{ width: `${timelineWidth}px`, '--grid-step': `${gridStepPx}px` }"
            @pointerdown="startBoxSelect"
            @dblclick="onTrackDoubleClick"
            @pointermove="onTrackHoverMove"
            @pointerleave="onTrackHoverLeave"
          >
            <div
              v-for="segment in segments"
              :key="segment.id"
              class="segment"
              :class="{
                'is-selected': selectionIds.has(segment.id),
              }"
              :style="segmentStyle(segment)"
              @pointerdown="startDrag($event, segment, 'move')"
            >
              <span class="segment-text">{{ segment.text }}</span>
              <span
                class="handle start"
                @pointerdown.stop.prevent="startDrag($event, segment, 'resize-start')"
              ></span>
              <span
                class="handle end"
                @pointerdown.stop.prevent="startDrag($event, segment, 'resize-end')"
              ></span>
            </div>
            <div v-if="boxState.active" class="selection-box" :style="boxStyle"></div>
            <div
              v-if="hoverState.active"
              class="hover-playhead"
              :style="{ left: `${hoverState.x}px` }"
            >
              <span class="hover-time">{{ formatClock(hoverTimeMs) }}</span>
            </div>
            <div
              class="playhead"
              :style="{ left: `${playheadX}px` }"
              @pointerdown.stop="startPlayheadDrag"
            ></div>
          </div>
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
  <a-modal
    v-model:visible="importVisible"
    title="Import SRT/LRC"
    :ok-text="'Import'"
    :cancel-text="'Cancel'"
    :width="720"
    @ok="applyImport"
  >
    <a-space direction="vertical" size="medium" fill>
      <a-upload
        :auto-upload="false"
        :show-file-list="false"
        accept=".srt,.lrc,.txt"
        @change="handleFile"
      >
        <template #upload-button>
          <a-button>Click to Upload</a-button>
        </template>
      </a-upload>
      <a-textarea
        v-model="importText"
        placeholder="Paste SRT/LRC content here..."
        :auto-size="{ minRows: 10, maxRows: 18 }"
      />
      <a-alert
        type="info"
        show-icon
        title="Tips"
        :content="'Supports SRT and LRC. If both file and pasted content are provided, pasted content wins.'"
      />
    </a-space>
  </a-modal>
  <a-modal v-model:visible="exportVisible" title="Export" :width="720">
    <a-space direction="vertical" size="medium" fill>
      <a-select v-model="exportFormat" :style="{ width: '160px' }">
        <a-option value="srt">SRT</a-option>
        <a-option value="lrc">LRC</a-option>
      </a-select>
      <a-textarea
        :model-value="exportText"
        :auto-size="{ minRows: 10, maxRows: 18 }"
        readonly
      />
    </a-space>
    <template #footer>
      <a-space>
        <a-button @click="exportVisible = false">Cancel</a-button>
        <a-button @click="copyExport">Copy</a-button>
        <a-button type="primary" @click="downloadExport">Download</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { IconDelete, IconPlayArrow } from '@arco-design/web-vue/es/icon'

type Segment = {
  id: string
  start: number
  end: number
  text: string
  color?: string
}

type DragMode = 'move' | 'resize-start' | 'resize-end'

const segments = ref<Segment[]>([
  { id: 'seg-1', start: 1500, end: 5200, text: '第一句歌詞', color: '#2c2f33' },
  { id: 'seg-2', start: 5200, end: 9800, text: '第二句歌詞', color: '#db4c3f' },
  { id: 'seg-3', start: 10500, end: 13800, text: '第三句歌詞', color: '#2c2f33' },
])
const pxPerMs = ref(0.08)
const zoomLevel = ref(80)
const minDuration = 300
const selectionIds = ref(new Set<string>())
const autoFollow = ref(true)
const trackRef = ref<HTMLElement | null>(null)
const timelineScrollRef = ref<HTMLElement | null>(null)
const headerScrollRef = ref<HTMLElement | null>(null)
const snap = reactive({ grid: 10 })
const importVisible = ref(false)
const importText = ref('')
const exportVisible = ref(false)
const exportFormat = ref<'srt' | 'lrc'>('srt')
const undoStack = ref<Segment[][]>([])
const redoStack = ref<Segment[][]>([])
let dragSnapshot: Segment[] | null = null
let hasPendingDrag = false
const playheadMs = ref(0)
const isPlaying = ref(false)
let playLastTs = 0
let playRaf = 0
const youtubeUrl = ref('')
const youtubeVideoId = ref('')
const youtubeEnabled = ref(true)
const youtubeReady = ref(false)
const isYouTubePlaying = ref(false)
let youtubePlayer: any = null
let youtubeRaf = 0
const youtubeDurationMs = ref(0)
let youtubeLoadTimer = 0

const tickStepMs = computed(() => {
  const target = 100 / pxPerMs.value
  const options = [500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000]
  return options.find((step) => step >= target) ?? options[options.length - 1]
})

const ticks = computed(() => {
  const durationMs = Math.ceil(timelineWidth.value / pxPerMs.value)
  const result: number[] = []
  for (let t = 0; t <= durationMs; t += tickStepMs.value) {
    result.push(t)
  }
  return result
})

const gridStepPx = computed(() => {
  const step = pxPerMs.value * 1000
  return Math.max(24, Math.round(step))
})

const playheadX = computed(() => playheadMs.value * pxPerMs.value)
const activePlaySegment = computed(() =>
  segments.value.find((segment) => playheadMs.value >= segment.start && playheadMs.value <= segment.end),
)
const activePlayId = computed(() => activePlaySegment.value?.id ?? '')
const activePlayText = computed(() => activePlaySegment.value?.text ?? '')
const orderedSegments = computed(() => [...segments.value].sort((a, b) => a.start - b.start))
const lyricListRef = ref<HTMLElement | null>(null)
const lyricItemRefs = new Map<string, HTMLElement>()

const setLyricItemRef = (id: string) => (el: Element | null) => {
  if (el instanceof HTMLElement) {
    lyricItemRefs.set(id, el)
  } else {
    lyricItemRefs.delete(id)
  }
}

const isSegmentPlaying = (segment: Segment) => {
  return playheadMs.value >= segment.start && playheadMs.value < segment.end
}

const setPlayheadMs = (ms: number) => {
  playheadMs.value = snapValue(ms)
  if (youtubeEnabled.value && youtubeReady.value && youtubePlayer) {
    youtubePlayer.seekTo(playheadMs.value / 1000, true)
  }
  if (isPlaying.value) {
    ensurePlayheadInView()
  }
}

const timelineWidth = computed(() => {
  const maxEnd = Math.max(0, ...segments.value.map((segment) => segment.end))
  const maxDuration = Math.max(maxEnd, youtubeEnabled.value ? youtubeDurationMs.value : 0)
  const base = maxDuration * pxPerMs.value + 400
  return Math.max(900, Math.round(base))
})

const timelineDuration = computed(() => {
  const maxEnd = Math.max(0, ...segments.value.map((segment) => segment.end))
  return Math.max(maxEnd, youtubeEnabled.value ? youtubeDurationMs.value : 0)
})
const formatMark = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const formatClock = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(
    cs,
  ).padStart(2, '0')}`
}

const segmentStyle = (segment: Segment) => {
  const left = segment.start * pxPerMs.value
  const width = Math.max((segment.end - segment.start) * pxPerMs.value, 16)
  return {
    left: `${left}px`,
    width: `${width}px`,
    background: segment.color ?? '#2c2f33',
  }
}

watch(
  zoomLevel,
  (value) => {
    pxPerMs.value = value / 1000
  },
  { immediate: true },
)

watch(youtubeEnabled, (enabled) => {
  if (!enabled) {
    stopYouTubeTick()
    isYouTubePlaying.value = false
    if (youtubePlayer) {
      youtubePlayer.pauseVideo()
    }
  }
})

watch(activePlayId, (id) => {
  if (!id) return
  nextTick(() => {
    const container = lyricListRef.value
    const item = lyricItemRefs.get(id)
    if (!container || !item) return
    item.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
})

const cloneSegments = () => segments.value.map((segment) => ({ ...segment }))

const updateSegment = (id: string, patch: Partial<Segment>) => {
  segments.value = segments.value.map((segment) =>
    segment.id === id ? { ...segment, ...patch } : segment,
  )
}

const parseInputNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const updateListStart = (id: string, value: unknown) => {
  const segment = segments.value.find((item) => item.id === id)
  const nextSec = parseInputNumber(value)
  if (!segment || nextSec === null) return
  const nextStart = Math.max(0, Math.round(nextSec * 1000))
  const nextEnd = Math.max(nextStart + minDuration, segment.end)
  updateSegment(id, { start: Math.min(nextStart, nextEnd - minDuration), end: nextEnd })
}

const updateListEnd = (id: string, value: unknown) => {
  const segment = segments.value.find((item) => item.id === id)
  const nextSec = parseInputNumber(value)
  if (!segment || nextSec === null) return
  const nextEnd = Math.max(segment.start + minDuration, Math.round(nextSec * 1000))
  updateSegment(id, { end: nextEnd })
}

const updateListText = (id: string, value: unknown) => {
  const text = typeof value === 'string' ? value : String(value ?? '')
  updateSegment(id, { text })
}

const resolveOverlaps = () => {
  if (segments.value.length < 2) return
  pushHistorySnapshot(cloneSegments())
  const ordered = [...segments.value].sort((a, b) => a.start - b.start)
  let cursor = 0
  const next = ordered.map((segment) => {
    const duration = Math.max(minDuration, segment.end - segment.start)
    const start = Math.max(cursor, segment.start)
    const end = start + duration
    cursor = end
    return { ...segment, start, end }
  })
  segments.value = next
}

const setSelection = (id: string, additive: boolean) => {
  const next = new Set(selectionIds.value)
  if (additive) {
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
  } else {
    next.clear()
    next.add(id)
  }
  selectionIds.value = next
}

const clearSelection = () => {
  selectionIds.value = new Set<string>()
}

const snapValue = (value: number) => {
  return Math.round(value / snap.grid) * snap.grid
}

const dragState = ref<{
  mode: DragMode
  originX: number
  items: Array<{ id: string; start: number; end: number }>
} | null>(null)

const startDrag = (event: PointerEvent, segment: Segment, mode: DragMode) => {
  if (event.button !== 0) return
  const wasSelected = selectionIds.value.has(segment.id)
  if (event.shiftKey) {
    setSelection(segment.id, true)
  } else if (!wasSelected) {
    setSelection(segment.id, false)
  }
  const ids = Array.from(selectionIds.value)
  const targets = ids.length > 0 ? ids : [segment.id]
  const items = segments.value
    .filter((item) => targets.includes(item.id))
    .map((item) => ({ id: item.id, start: item.start, end: item.end }))
  dragState.value = {
    mode,
    originX: event.clientX,
    items,
  }
  dragSnapshot = cloneSegments()
  hasPendingDrag = false
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragState.value) return
  const { mode, originX, items } = dragState.value
  const deltaMs = (event.clientX - originX) / pxPerMs.value
  if (mode === 'move') {
    const anchor = items[0]
    const targetStart = snapValue(anchor.start + deltaMs)
    const rawOffset = targetStart - anchor.start
    const minStart = Math.min(...items.map((item) => item.start))
    const offset = Math.max(rawOffset, -minStart)
    items.forEach((item) => {
      updateSegment(item.id, {
        start: item.start + offset,
        end: item.end + offset,
      })
    })
    hasPendingDrag = true
    return
  }
  if (mode === 'resize-start') {
    const item = items[0]
    const snapped = snapValue(item.start + deltaMs)
    const nextStart = Math.max(0, Math.min(snapped, item.end - minDuration))
    updateSegment(item.id, { start: nextStart })
    hasPendingDrag = true
    return
  }
  const item = items[0]
  const snapped = snapValue(item.end + deltaMs)
  const nextEnd = Math.max(item.start + minDuration, snapped)
  updateSegment(item.id, { end: nextEnd })
  hasPendingDrag = true
}

const onPointerUp = () => {
  dragState.value = null
  boxState.active = false
  if (hasPendingDrag && dragSnapshot) {
    pushHistorySnapshot(dragSnapshot)
  }
  dragSnapshot = null
  hasPendingDrag = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

let syncingScroll = false

const onTimelineScroll = () => {
  if (syncingScroll) return
  if (!timelineScrollRef.value || !headerScrollRef.value) return
  syncingScroll = true
  headerScrollRef.value.scrollLeft = timelineScrollRef.value.scrollLeft
  syncingScroll = false
}

const onHeaderScroll = () => {
  if (syncingScroll) return
  if (!timelineScrollRef.value || !headerScrollRef.value) return
  syncingScroll = true
  timelineScrollRef.value.scrollLeft = headerScrollRef.value.scrollLeft
  syncingScroll = false
}

const boxState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
})
const hoverState = reactive({
  active: false,
  x: 0,
})
const hoverTimeMs = computed(() => Math.max(0, Math.round(hoverState.x / pxPerMs.value)))
const boxPending = ref(false)
const boxDragThreshold = 4

const boxStyle = computed(() => {
  const left = Math.min(boxState.startX, boxState.currentX)
  const top = Math.min(boxState.startY, boxState.currentY)
  const width = Math.abs(boxState.currentX - boxState.startX)
  const height = Math.abs(boxState.currentY - boxState.startY)
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

const startBoxSelect = (event: PointerEvent) => {
  if (event.button !== 0) return
  if (event.target !== trackRef.value) return
  clearSelection()
  const rect = trackRef.value.getBoundingClientRect()
  const localX = event.clientX - rect.left
  const localY = event.clientY - rect.top
  boxState.startX = localX
  boxState.startY = localY
  boxState.currentX = localX
  boxState.currentY = localY
  boxPending.value = true
  window.addEventListener('pointermove', onBoxMove)
  window.addEventListener('pointerup', onBoxUp)
}

const startPlayheadDrag = (event: PointerEvent) => {
  if (event.button !== 0) return
  updatePlayheadFromEvent(event)
  window.addEventListener('pointermove', onPlayheadMove)
  window.addEventListener('pointerup', onPlayheadUp)
}

const onPlayheadMove = (event: PointerEvent) => {
  updatePlayheadFromEvent(event)
}

const onPlayheadUp = () => {
  window.removeEventListener('pointermove', onPlayheadMove)
  window.removeEventListener('pointerup', onPlayheadUp)
}

const updatePlayheadFromEvent = (event: PointerEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const localX = event.clientX - rect.left
  updatePlayheadFromX(localX)
}

const updatePlayheadFromX = (localX: number) => {
  const clampedX = Math.max(0, Math.min(localX, timelineWidth.value))
  const ms = clampedX / pxPerMs.value
  setPlayheadMs(ms)
}

const onTrackHoverMove = (event: PointerEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const localX = event.clientX - rect.left
  hoverState.x = Math.max(0, Math.min(localX, timelineWidth.value))
  hoverState.active = true
}

const onTrackHoverLeave = () => {
  hoverState.active = false
}

const onHeaderPointerDown = (event: PointerEvent) => {
  if (event.button !== 0) return
  if (!headerScrollRef.value) return
  const rect = headerScrollRef.value.getBoundingClientRect()
  const localX = event.clientX - rect.left + headerScrollRef.value.scrollLeft
  updatePlayheadFromX(localX)
  headerDragActive.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onHeaderPointerMove)
  window.addEventListener('pointerup', onHeaderPointerUp)
}

const headerDragActive = ref(false)

const onHeaderPointerMove = (event: PointerEvent) => {
  if (!headerDragActive.value || !headerScrollRef.value) return
  const rect = headerScrollRef.value.getBoundingClientRect()
  const localX = event.clientX - rect.left + headerScrollRef.value.scrollLeft
  updatePlayheadFromX(localX)
}

const onHeaderPointerUp = () => {
  headerDragActive.value = false
  window.removeEventListener('pointermove', onHeaderPointerMove)
  window.removeEventListener('pointerup', onHeaderPointerUp)
}

const onTrackDoubleClick = (event: MouseEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const localX = event.clientX - rect.left
  const start = snapValue(localX / pxPerMs.value)
  const end = start + Math.max(minDuration, 1200)
  const nextId = `seg-${Date.now()}`
  pushHistorySnapshot(cloneSegments())
  segments.value = [
    ...segments.value,
    { id: nextId, start, end, text: 'New line', color: '#2c2f33' },
  ]
  selectionIds.value = new Set([nextId])
}

const onBoxMove = (event: PointerEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  boxState.currentX = event.clientX - rect.left
  boxState.currentY = event.clientY - rect.top
  if (boxPending.value && !boxState.active) {
    const dx = boxState.currentX - boxState.startX
    const dy = boxState.currentY - boxState.startY
    const distance = Math.hypot(dx, dy)
    if (distance < boxDragThreshold) return
    boxState.active = true
    boxPending.value = false
    clearSelection()
  }
  if (!boxState.active) return
  const left = Math.min(boxState.startX, boxState.currentX)
  const right = Math.max(boxState.startX, boxState.currentX)
  const top = Math.min(boxState.startY, boxState.currentY)
  const bottom = Math.max(boxState.startY, boxState.currentY)
  const next = new Set<string>()
  segments.value.forEach((segment) => {
    const segLeft = segment.start * pxPerMs.value
    const segRight = segment.end * pxPerMs.value
    const segTop = 48
    const segBottom = segTop + 64
    const intersects =
      segLeft < right && segRight > left && segTop < bottom && segBottom > top
    if (intersects) next.add(segment.id)
  })
  selectionIds.value = next
}

const onBoxUp = () => {
  if (boxPending.value && !boxState.active) {
    updatePlayheadFromX(boxState.currentX)
  }
  boxState.active = false
  boxPending.value = false
  window.removeEventListener('pointermove', onBoxMove)
  window.removeEventListener('pointerup', onBoxUp)
}

const handleFile = async (info: unknown) => {
  const raw =
    Array.isArray(info) && info.length > 0
      ? info[0]
      : (info as { file?: { file?: File; originFile?: File } }).file ??
        (info as { fileList?: Array<{ file?: File; originFile?: File }> }).fileList?.[0]
  if (!raw) return
  const file =
    raw instanceof File
      ? raw
      : raw.file instanceof File
        ? raw.file
        : raw.originFile instanceof File
          ? raw.originFile
          : null
  if (!file) return
  const text = await file.text()
  importText.value = text
}

const applyImport = () => {
  const text = importText.value.trim()
  if (!text) return
  const parsed = text.includes('-->')
    ? parseSrt(text)
    : text.includes('[') && text.includes(']')
      ? parseLrc(text)
      : parsePlainLyrics(text)
  if (parsed.length === 0) return
  pushHistorySnapshot(cloneSegments())
  segments.value = parsed
  selectionIds.value = new Set([parsed[0].id])
  importVisible.value = false
}

const exportText = computed(() => {
  const ordered = [...segments.value].sort((a, b) => a.start - b.start)
  return exportFormat.value === 'srt' ? buildSrt(ordered) : buildLrc(ordered)
})

const copyExport = async () => {
  try {
    await navigator.clipboard.writeText(exportText.value)
  } catch {
    // ignore clipboard errors
  }
}

const downloadExport = () => {
  const blob = new Blob([exportText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `lyrics.${exportFormat.value}`
  link.click()
  URL.revokeObjectURL(url)
}

const pushHistorySnapshot = (snapshot: Segment[]) => {
  undoStack.value.push(snapshot)
  redoStack.value = []
}

const undo = () => {
  if (undoStack.value.length === 0) return
  const current = cloneSegments()
  const previous = undoStack.value.pop()
  if (!previous) return
  redoStack.value.push(current)
  segments.value = previous
}

const redo = () => {
  if (redoStack.value.length === 0) return
  const current = cloneSegments()
  const next = redoStack.value.pop()
  if (!next) return
  undoStack.value.push(current)
  segments.value = next
}

const removeSelected = () => {
  if (selectionIds.value.size === 0) return
  pushHistorySnapshot(cloneSegments())
  segments.value = segments.value.filter((segment) => !selectionIds.value.has(segment.id))
  selectionIds.value = new Set<string>()
}

const onKeyDown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
  const key = event.key.toLowerCase()
  const isMeta = event.metaKey || event.ctrlKey
  if (key === '=' || key === '+') {
    event.preventDefault()
    zoomLevel.value = Math.min(160, zoomLevel.value + 10)
    return
  }
  if (key === '-' || key === '_') {
    event.preventDefault()
    zoomLevel.value = Math.max(5, zoomLevel.value - 10)
    return
  }
  if (key === ' ') {
    event.preventDefault()
    togglePlay()
    return
  }
  if (isMeta && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      redo()
    } else {
      undo()
    }
    return
  }
  if (key === 'delete' || key === 'backspace') {
    event.preventDefault()
    removeSelected()
  }
}

const onTimelineWheel = (event: WheelEvent) => {
  if (!event.ctrlKey) return
  event.preventDefault()
  const delta = event.deltaY
  if (delta === 0) return
  const step = 5
  if (delta < 0) {
    zoomLevel.value = Math.min(160, zoomLevel.value + step)
  } else {
    zoomLevel.value = Math.max(5, zoomLevel.value - step)
  }
}

onMounted(() => {
  pushHistorySnapshot(cloneSegments())
  window.addEventListener('keydown', onKeyDown)
  nextTick(() => {
    timelineScrollRef.value?.addEventListener('wheel', onTimelineWheel, { passive: false })
    headerScrollRef.value?.addEventListener('wheel', onTimelineWheel, { passive: false })
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  timelineScrollRef.value?.removeEventListener('wheel', onTimelineWheel)
  headerScrollRef.value?.removeEventListener('wheel', onTimelineWheel)
  stopPlay()
  stopYouTubeTick()
})

const tickPlay = (ts: number) => {
  if (!isPlaying.value) return
  if (!playLastTs) playLastTs = ts
  const delta = ts - playLastTs
  playLastTs = ts
  const next = playheadMs.value + delta
  const max = timelineDuration.value
  if (next >= max) {
    playheadMs.value = max
    stopPlay()
    return
  }
  playheadMs.value = next
  ensurePlayheadInView()
  playRaf = requestAnimationFrame(tickPlay)
}

const togglePlay = () => {
  if (youtubeEnabled.value && youtubeReady.value && youtubePlayer) {
    if (isYouTubePlaying.value) {
      youtubePlayer.pauseVideo()
    } else {
      youtubePlayer.playVideo()
    }
    return
  }
  if (isPlaying.value) {
    stopPlay()
    return
  }
  startFakePlay()
}

const stopPlay = () => {
  stopFakePlay()
  if (youtubeEnabled.value && youtubeReady.value && youtubePlayer) {
    youtubePlayer.pauseVideo()
    youtubePlayer.seekTo(0, true)
  }
  stopYouTubeTick()
}

const stopFakePlay = () => {
  isPlaying.value = false
  playLastTs = 0
  if (playRaf) cancelAnimationFrame(playRaf)
  playRaf = 0
}

const startFakePlay = () => {
  if (isPlaying.value) return
  isPlaying.value = true
  playLastTs = 0
  playRaf = requestAnimationFrame(tickPlay)
}

const playSegment = (segment: Segment) => {
  setSelection(segment.id, false)
  setPlayheadMs(segment.start)
  if (youtubeEnabled.value && youtubeReady.value && youtubePlayer) {
    youtubePlayer.playVideo()
    return
  }
  startFakePlay()
}

const deleteSegment = (id: string) => {
  pushHistorySnapshot(cloneSegments())
  segments.value = segments.value.filter((segment) => segment.id !== id)
  if (selectionIds.value.has(id)) {
    const next = new Set(selectionIds.value)
    next.delete(id)
    selectionIds.value = next
  }
}

const selectSegmentFromList = (segment: Segment) => {
  setSelection(segment.id, false)
  setPlayheadMs(segment.start)
}

const ensurePlayheadInView = () => {
  if (!timelineScrollRef.value) return
  if (!autoFollow.value) return
  const view = timelineScrollRef.value
  const x = playheadX.value
  const target = x - view.clientWidth / 2
  view.scrollLeft = Math.max(0, target)
}

const buildSrt = (items: Segment[]) => {
  return items
    .map((segment, index) => {
      const start = formatSrtTime(segment.start)
      const end = formatSrtTime(segment.end)
      return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`
    })
    .join('\n')
    .trim()
}

const formatSrtTime = (ms: number) => {
  const hh = Math.floor(ms / 3600000)
  const mm = Math.floor((ms % 3600000) / 60000)
  const ss = Math.floor((ms % 60000) / 1000)
  const mss = Math.floor(ms % 1000)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(
    ss,
  ).padStart(2, '0')},${String(mss).padStart(3, '0')}`
}

const buildLrc = (items: Segment[]) => {
  return items
    .map((segment) => `${formatLrcTime(segment.start)} ${segment.text}`)
    .join('\n')
    .trim()
}

const formatLrcTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const centis = Math.floor((ms % 1000) / 10)
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(centis).padStart(2, '0')}]`
}

const parseSrt = (content: string): Segment[] => {
  const blocks = content
    .replace(/\r/g, '')
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
  const result: Segment[] = []
  blocks.forEach((block, index) => {
    const lines = block.split('\n').map((line) => line.trim())
    const timeLine = lines.find((line) => line.includes('-->'))
    if (!timeLine) return
    const [startRaw, endRaw] = timeLine.split('-->').map((part) => part.trim())
    const start = parseSrtTime(startRaw)
    const end = parseSrtTime(endRaw)
    const textLines = lines.filter((line) => !line.includes('-->') && !/^\d+$/.test(line))
    const text = textLines.join(' ')
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return
    result.push({
      id: `srt-${index}-${start}`,
      start,
      end,
      text,
      color: index % 2 === 0 ? '#2c2f33' : '#db4c3f',
    })
  })
  return result
}

const parseSrtTime = (raw: string) => {
  const match = raw.match(/(\d{2}):(\d{2}):(\d{2}),(\d{1,3})/)
  if (!match) return Number.NaN
  const [, hh, mm, ss, ms] = match
  return (
    Number(hh) * 3600000 +
    Number(mm) * 60000 +
    Number(ss) * 1000 +
    Number(ms.padEnd(3, '0'))
  )
}

const parseLrc = (content: string): Segment[] => {
  const lines = content.replace(/\r/g, '').split('\n')
  const rows: Array<{ time: number; text: string }> = []
  lines.forEach((line) => {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)]
    if (matches.length === 0) return
    const lyric = line.replace(/\[.*?\]/g, '').trim()
    matches.forEach((match) => {
      const [, mm, ss, ms = '0'] = match
      const time = parseLrcTime(mm, ss, ms)
      rows.push({ time, text: lyric })
    })
  })
  rows.sort((a, b) => a.time - b.time)
  const segments: Segment[] = []
  rows.forEach((row, index) => {
    const next = rows[index + 1]
    const end = next ? Math.max(row.time + minDuration, next.time) : row.time + 2000
    segments.push({
      id: `lrc-${index}-${row.time}`,
      start: row.time,
      end,
      text: row.text || `Line ${index + 1}`,
      color: index % 2 === 0 ? '#2c2f33' : '#db4c3f',
    })
  })
  return segments
}

const parseLrcTime = (mm: string, ss: string, fraction: string) => {
  const minutes = Number(mm)
  const seconds = Number(ss)
  const msRaw = fraction.trim()
  const ms =
    msRaw.length === 0
      ? 0
      : msRaw.length === 1
        ? Number(msRaw) * 100
        : msRaw.length === 2
          ? Number(msRaw) * 10
          : Number(msRaw.slice(0, 3))
  return minutes * 60000 + seconds * 1000 + ms
}

const parsePlainLyrics = (content: string): Segment[] => {
  const lines = content
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) return []
  const intervalMs = 3000
  return lines.map((line, index) => {
    const start = snapValue(index * intervalMs)
    const end = snapValue(start + intervalMs)
    return {
      id: `plain-${index}-${start}`,
      start,
      end,
      text: line,
      color: index % 2 === 0 ? '#2c2f33' : '#db4c3f',
    }
  })
}

const loadYouTube = async () => {
  const id = extractYouTubeId(youtubeUrl.value)
  if (!id) return
  youtubeVideoId.value = id
  await nextTick()
  await loadYouTubeApi()
  if (youtubePlayer) {
    youtubePlayer.cueVideoById(id)
    updateYouTubeDuration()
    return
  }
  youtubePlayer = new window.YT.Player('youtube-player', {
    videoId: id,
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
    },
    events: {
      onReady: () => {
        youtubeReady.value = true
        updateYouTubeDuration()
      },
      onStateChange: (event: { data: number }) => {
        const state = event.data
        const playing = state === window.YT.PlayerState.PLAYING
        isYouTubePlaying.value = playing
        if (playing) {
          stopFakePlay()
          updateYouTubeDuration()
          startYouTubeTick()
        } else {
          stopYouTubeTick()
        }
      },
    },
  })
}

const extractYouTubeId = (value: string) => {
  const url = value.trim()
  if (!url) return ''
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (short) return short[1]
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  if (watch) return watch[1]
  const embed = url.match(/\/embed\/([a-zA-Z0-9_-]{6,})/)
  if (embed) return embed[1]
  if (/^[a-zA-Z0-9_-]{6,}$/.test(url)) return url
  return ''
}

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const existing = document.querySelector('script[data-youtube-api]')
    if (existing) {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve()
      }
      return
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.dataset.youtubeApi = '1'
    window.onYouTubeIframeAPIReady = () => resolve()
    document.head.appendChild(script)
  })
}

const startYouTubeTick = () => {
  stopYouTubeTick()
  const step = () => {
    if (!youtubePlayer || !youtubeEnabled.value) return
    const current = youtubePlayer.getCurrentTime?.() ?? 0
    playheadMs.value = current * 1000
    updateYouTubeDuration()
    ensurePlayheadInView()
    youtubeRaf = requestAnimationFrame(step)
  }
  youtubeRaf = requestAnimationFrame(step)
}

const stopYouTubeTick = () => {
  if (youtubeRaf) cancelAnimationFrame(youtubeRaf)
  youtubeRaf = 0
}

const updateYouTubeDuration = () => {
  if (!youtubePlayer?.getDuration) return
  const duration = youtubePlayer.getDuration() || 0
  youtubeDurationMs.value = duration * 1000
}

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}
</script>

