<template>
  <section class="timeline-editor" aria-label="時間軸編輯器">
    <div class="timeline-toolbar">
      <div class="timeline-toolbar-group timeline-transport">
        <button class="btn btn-primary btn-sm" type="button" @click="emit('toggle-play')">
          <span class="btn-symbol">{{ props.isPlaying ? 'Ⅱ' : '▶' }}</span>
          {{ props.isPlaying ? '暫停' : '播放' }}
        </button>
        <button class="btn btn-secondary btn-sm" type="button" @click="emit('stop-play')">
          停止
        </button>
        <span class="timecode">{{ formatClock(props.playheadMs) }}</span>
        <span class="timeline-active-copy">{{ activeText || '尚未播放到歌詞' }}</span>
      </div>

      <div class="timeline-toolbar-group timeline-actions">
        <button class="btn btn-quiet btn-sm" type="button" @click="resolveOverlaps">
          整理重疊
        </button>
        <button
          class="btn btn-quiet btn-sm"
          type="button"
          :aria-pressed="props.autoFollow"
          @click="emit('update:autoFollow', !props.autoFollow)"
        >
          跟隨：{{ props.autoFollow ? '開' : '關' }}
        </button>
        <label class="zoom-control">
          <span>縮放</span>
          <input v-model.number="zoomLevel" type="range" min="5" max="160" step="5" />
          <output>{{ zoomLevel }}%</output>
        </label>
      </div>
    </div>

    <div class="timeline-help">
      <span><kbd>雙擊</kbd> 新增歌詞</span>
      <span><kbd>Shift</kbd> 多選</span>
      <span><kbd>Ctrl/Cmd + Z</kbd> 復原</span>
      <span><kbd>Delete</kbd> 刪除選取</span>
    </div>

    <div class="timeline-stage">
      <div
        ref="headerScrollRef"
        class="timeline-scale-scroll"
        @scroll="onHeaderScroll"
        @pointerdown="onHeaderPointerDown"
      >
        <div class="timeline-scale" :style="{ width: `${timelineWidth}px` }">
          <div
            v-for="tick in ticks"
            :key="tick"
            class="scale-tick"
            :class="{ 'is-major': tick % 1000 === 0 }"
            :style="{ left: `${tick * pxPerMs}px` }"
          >
            <span v-if="tick % 1000 === 0" class="scale-label">{{ formatClock(tick) }}</span>
          </div>
        </div>
      </div>

      <div ref="timelineScrollRef" class="timeline-scroll" @scroll="onTimelineScroll">
        <div
          ref="trackRef"
          class="timeline-track"
          :style="{ width: `${timelineWidth}px`, '--grid-step': `${gridStepPx}px` }"
          tabindex="0"
          @pointerdown="startBoxSelect"
          @dblclick="onTrackDoubleClick"
          @pointermove="onTrackHoverMove"
          @pointerleave="onTrackHoverLeave"
        >
          <div v-if="timedLines.length === 0" class="timeline-empty">
            <span class="empty-kicker">TIME MAP</span>
            <strong>時間軸還是空的</strong>
            <span>先在左側列表打點，或雙擊這裡新增一行歌詞。</span>
          </div>

          <div
            v-for="(line, index) in orderedSegments"
            :key="line.id"
            class="timeline-segment"
            :class="{ 'is-selected': props.selectionIds.has(line.id) }"
            :style="segmentStyle(line)"
            @pointerdown="startDrag($event, line, 'move')"
          >
            <span class="segment-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="segment-text">{{ line.text || '空白歌詞' }}</span>
            <span
              class="segment-handle is-start"
              aria-label="調整開始時間"
              @pointerdown.stop.prevent="startDrag($event, line, 'resize-start')"
            ></span>
            <span
              class="segment-handle is-end"
              aria-label="調整結束時間"
              @pointerdown.stop.prevent="startDrag($event, line, 'resize-end')"
            ></span>
          </div>

          <div v-if="boxState.active" class="selection-box" :style="boxStyle"></div>
          <div
            v-if="snapIndicator.active"
            class="snap-indicator"
            :style="{ left: `${snapIndicator.x}px` }"
          ></div>
          <div
            v-if="hoverState.active && !dragState"
            class="hover-playhead"
            :style="{ left: `${hoverState.x}px` }"
          >
            <span class="hover-time">{{ formatClock(hoverTimeMs) }}</span>
          </div>
          <div
            class="timeline-playhead"
            :style="{ left: `${playheadX}px` }"
            aria-label="播放頭"
            @pointerdown.stop="startPlayheadDrag"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { cloneLines, createLineId, type LyricLine } from '../types'
import { formatClock, isTimedLine } from '../utils/lyric-format'

type DragMode = 'move' | 'resize-start' | 'resize-end'
type DragItem = { id: string; startMs: number; endMs: number }

const props = defineProps<{
  lines: LyricLine[]
  playheadMs: number
  selectionIds: Set<string>
  isPlaying: boolean
  autoFollow: boolean
  mediaDurationMs: number
}>()

const emit = defineEmits<{
  (event: 'update:lines', value: LyricLine[]): void
  (event: 'update:playheadMs', value: number): void
  (event: 'update:selectionIds', value: Set<string>): void
  (event: 'update:autoFollow', value: boolean): void
  (event: 'history', value: LyricLine[]): void
  (event: 'toggle-play'): void
  (event: 'stop-play'): void
}>()

const minDuration = 300
const snapGridMs = 10
const snapThresholdPx = 8
const zoomLevel = ref(80)
const trackRef = ref<HTMLElement | null>(null)
const timelineScrollRef = ref<HTMLElement | null>(null)
const headerScrollRef = ref<HTMLElement | null>(null)
const undoStack = ref<LyricLine[][]>([])
const redoStack = ref<LyricLine[][]>([])
const dragState = ref<{ mode: DragMode; originX: number; items: DragItem[] } | null>(null)
const dragSnapshot = ref<LyricLine[] | null>(null)
const hasPendingDrag = ref(false)
const headerDragActive = ref(false)
let syncingScroll = false

const boxState = reactive({
  active: false,
  pending: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
})
const hoverState = reactive({ active: false, x: 0 })
const snapIndicator = reactive({ active: false, x: 0 })

const timedLines = computed(() => props.lines.filter(isTimedLine))
const orderedSegments = computed(() => [...timedLines.value].sort((a, b) => a.startMs - b.startMs))
const activeSegment = computed(() =>
  orderedSegments.value.find(
    (line) => props.playheadMs >= line.startMs && props.playheadMs <= line.endMs,
  ),
)
const activeText = computed(() => activeSegment.value?.text ?? '')
const pxPerMs = computed(() => zoomLevel.value / 1000)
const playheadX = computed(() => props.playheadMs * pxPerMs.value)
const timelineDuration = computed(() => {
  const maxEnd = Math.max(0, ...timedLines.value.map((line) => line.endMs))
  return Math.max(maxEnd, props.mediaDurationMs)
})
const timelineWidth = computed(() => Math.max(900, Math.round(timelineDuration.value * pxPerMs.value + 420)))
const gridStepPx = computed(() => Math.max(26, Math.round(pxPerMs.value * 1000)))
const tickStepMs = computed(() => {
  const target = 100 / pxPerMs.value
  const options = [500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000]
  return options.find((step) => step >= target) ?? options[options.length - 1]
})
const ticks = computed(() => {
  const result: number[] = []
  for (let t = 0; t <= timelineDuration.value + 30000; t += tickStepMs.value) result.push(t)
  return result
})
const hoverTimeMs = computed(() => Math.max(0, Math.round(hoverState.x / pxPerMs.value)))
const boxStyle = computed(() => ({
  left: `${Math.min(boxState.startX, boxState.currentX)}px`,
  top: `${Math.min(boxState.startY, boxState.currentY)}px`,
  width: `${Math.abs(boxState.currentX - boxState.startX)}px`,
  height: `${Math.abs(boxState.currentY - boxState.startY)}px`,
}))

const emitLines = (lines: LyricLine[]) => emit('update:lines', cloneLines(lines))
const emitSelection = (ids: Set<string>) => emit('update:selectionIds', new Set(ids))
const snapshot = () => cloneLines(props.lines)
const pushHistory = (before: LyricLine[]) => {
  const cloned = cloneLines(before)
  undoStack.value.push(cloned)
  redoStack.value = []
  emit('history', cloneLines(cloned))
}
const sameLines = (a: LyricLine[], b: LyricLine[]) => JSON.stringify(a) === JSON.stringify(b)

const updateLine = (id: string, patch: Partial<LyricLine>) => {
  emitLines(props.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)))
}

const setSelection = (id: string, additive = false) => {
  const next = new Set(additive ? props.selectionIds : [])
  if (additive && next.has(id)) next.delete(id)
  else next.add(id)
  emitSelection(next)
}

const clearSelection = () => emitSelection(new Set())

const snapValue = (value: number) => Math.round(value / snapGridMs) * snapGridMs
const snapThresholdMs = () => snapThresholdPx / pxPerMs.value

const snapToNeighbors = (value: number, excludeIds: Set<string>) => {
  let bestValue = value
  let bestDistance = snapThresholdMs() + 1
  let snapped = false
  timedLines.value.forEach((line) => {
    if (excludeIds.has(line.id)) return
    for (const boundary of [line.startMs, line.endMs]) {
      const distance = Math.abs(boundary - value)
      if (distance <= snapThresholdMs() && distance < bestDistance) {
        bestValue = boundary
        bestDistance = distance
        snapped = true
      }
    }
  })
  return { value: bestValue, snapped }
}

const getMoveSnapOffset = (baseOffset: number, items: DragItem[], excludeIds: Set<string>) => {
  let bestAdjustment = 0
  let bestDistance = snapThresholdMs() + 1
  let bestSnapValue = 0

  items.forEach((item) => {
    for (const boundary of [item.startMs, item.endMs]) {
      const target = boundary + baseOffset
      const snapped = snapToNeighbors(target, excludeIds)
      if (!snapped.snapped) continue
      const adjustment = snapped.value - target
      const distance = Math.abs(adjustment)
      if (distance < bestDistance) {
        bestDistance = distance
        bestAdjustment = adjustment
        bestSnapValue = snapped.value
      }
    }
  })

  return {
    offset: baseOffset + bestAdjustment,
    snapped: bestDistance <= snapThresholdMs(),
    snapValue: bestSnapValue,
  }
}

const segmentStyle = (line: LyricLine) => ({
  left: `${line.startMs * pxPerMs.value}px`,
  width: `${Math.max((line.endMs - line.startMs) * pxPerMs.value, 16)}px`,
  '--segment-hue': 'var(--lx-navy-100)',
} as Record<string, string>)

const startDrag = (event: PointerEvent, line: LyricLine, mode: DragMode) => {
  if (event.button !== 0 || !isTimedLine(line)) return
  const alreadySelected = props.selectionIds.has(line.id)
  if (event.shiftKey) setSelection(line.id, true)
  else if (!alreadySelected) setSelection(line.id)
  const ids = Array.from(event.shiftKey || alreadySelected ? props.selectionIds : new Set([line.id]))
  const items = timedLines.value
    .filter((candidate) => ids.includes(candidate.id))
    .map((candidate) => ({ id: candidate.id, startMs: candidate.startMs, endMs: candidate.endMs }))
  dragState.value = { mode, originX: event.clientX, items: items.length ? items : [{ id: line.id, startMs: line.startMs, endMs: line.endMs }] }
  dragSnapshot.value = snapshot()
  hasPendingDrag.value = false
  try {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  } catch {
    // Pointer capture is not available in every embedded browser.
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

const onPointerMove = (event: PointerEvent) => {
  const current = dragState.value
  if (!current) return
  const deltaMs = (event.clientX - current.originX) / pxPerMs.value
  const excludeIds = new Set(current.items.map((item) => item.id))
  if (current.mode === 'move') {
    const anchor = current.items[0]
    const rawOffset = snapValue(anchor.startMs + deltaMs) - anchor.startMs
    const snappedMove = getMoveSnapOffset(rawOffset, current.items, excludeIds)
    const minStart = Math.min(...current.items.map((item) => item.startMs))
    const offset = Math.max(snappedMove.offset, -minStart)
    emitLines(props.lines.map((line) => {
      const item = current.items.find((candidate) => candidate.id === line.id)
      return item ? { ...line, startMs: item.startMs + offset, endMs: item.endMs + offset } : line
    }))
    snapIndicator.active = snappedMove.snapped
    snapIndicator.x = snappedMove.snapValue * pxPerMs.value
    hasPendingDrag.value = true
    return
  }

  const item = current.items[0]
  const line = props.lines.find((candidate) => candidate.id === item.id)
  if (!line) return
  if (current.mode === 'resize-start') {
    const raw = snapValue(item.startMs + deltaMs)
    const snapped = snapToNeighbors(raw, excludeIds)
    const nextStart = Math.max(0, Math.min(snapped.value, item.endMs - minDuration))
    updateLine(item.id, { startMs: nextStart })
    snapIndicator.active = snapped.snapped
    snapIndicator.x = snapped.value * pxPerMs.value
  } else {
    const raw = snapValue(item.endMs + deltaMs)
    const snapped = snapToNeighbors(raw, excludeIds)
    const nextEnd = Math.max(item.startMs + minDuration, snapped.value)
    updateLine(item.id, { endMs: nextEnd })
    snapIndicator.active = snapped.snapped
    snapIndicator.x = snapped.value * pxPerMs.value
  }
  hasPendingDrag.value = true
}

const onPointerUp = () => {
  if (hasPendingDrag.value && dragSnapshot.value && !sameLines(dragSnapshot.value, props.lines)) {
    pushHistory(dragSnapshot.value)
  }
  dragState.value = null
  dragSnapshot.value = null
  hasPendingDrag.value = false
  snapIndicator.active = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

const updatePlayheadFromX = (localX: number) => {
  const clamped = Math.max(0, Math.min(localX, timelineWidth.value))
  emit('update:playheadMs', snapValue(clamped / pxPerMs.value))
}

const updatePlayheadFromEvent = (event: PointerEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  updatePlayheadFromX(event.clientX - rect.left)
}

const startPlayheadDrag = (event: PointerEvent) => {
  if (event.button !== 0) return
  updatePlayheadFromEvent(event)
  window.addEventListener('pointermove', onPlayheadMove)
  window.addEventListener('pointerup', onPlayheadUp)
}
const onPlayheadMove = (event: PointerEvent) => updatePlayheadFromEvent(event)
const onPlayheadUp = () => {
  window.removeEventListener('pointermove', onPlayheadMove)
  window.removeEventListener('pointerup', onPlayheadUp)
}

const startBoxSelect = (event: PointerEvent) => {
  if (event.button !== 0 || event.target !== trackRef.value || !trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  boxState.startX = event.clientX - rect.left
  boxState.startY = event.clientY - rect.top
  boxState.currentX = boxState.startX
  boxState.currentY = boxState.startY
  boxState.pending = true
  clearSelection()
  window.addEventListener('pointermove', onBoxMove)
  window.addEventListener('pointerup', onBoxUp)
}

const onBoxMove = (event: PointerEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  boxState.currentX = event.clientX - rect.left
  boxState.currentY = event.clientY - rect.top
  if (boxState.pending && !boxState.active) {
    const distance = Math.hypot(boxState.currentX - boxState.startX, boxState.currentY - boxState.startY)
    if (distance < 4) return
    boxState.pending = false
    boxState.active = true
  }
  if (!boxState.active) return
  const left = Math.min(boxState.startX, boxState.currentX)
  const right = Math.max(boxState.startX, boxState.currentX)
  const top = Math.min(boxState.startY, boxState.currentY)
  const bottom = Math.max(boxState.startY, boxState.currentY)
  const next = new Set<string>()
  timedLines.value.forEach((line) => {
    const segmentLeft = line.startMs * pxPerMs.value
    const segmentRight = line.endMs * pxPerMs.value
    const intersects = segmentLeft < right && segmentRight > left && 42 < bottom && 112 > top
    if (intersects) next.add(line.id)
  })
  emitSelection(next)
}

const onBoxUp = () => {
  if (boxState.pending && !boxState.active) updatePlayheadFromX(boxState.currentX)
  boxState.active = false
  boxState.pending = false
  window.removeEventListener('pointermove', onBoxMove)
  window.removeEventListener('pointerup', onBoxUp)
}

const onTrackDoubleClick = (event: MouseEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const startMs = snapValue((event.clientX - rect.left) / pxPerMs.value)
  const endMs = startMs + 1200
  pushHistory(snapshot())
  const line: LyricLine = { id: createLineId('timeline'), text: '新的歌詞', startMs, endMs }
  emitLines([...props.lines, line])
  emitSelection(new Set([line.id]))
}

const resolveOverlaps = () => {
  if (timedLines.value.length < 2) return
  pushHistory(snapshot())
  let cursor = 0
  const next = props.lines.map((line) => ({ ...line }))
  orderedSegments.value.forEach((line) => {
    const duration = Math.max(minDuration, line.endMs - line.startMs)
    const startMs = Math.max(cursor, line.startMs)
    const target = next.find((candidate) => candidate.id === line.id)
    if (target) {
      target.startMs = startMs
      target.endMs = startMs + duration
    }
    cursor = startMs + duration
  })
  emitLines(next)
}

const undo = () => {
  const previous = undoStack.value.pop()
  if (!previous) return
  redoStack.value.push(snapshot())
  emitLines(previous)
}

const redo = () => {
  const next = redoStack.value.pop()
  if (!next) return
  undoStack.value.push(snapshot())
  emitLines(next)
}

const removeSelected = () => {
  if (props.selectionIds.size === 0) return
  pushHistory(snapshot())
  emitLines(props.lines.filter((line) => !props.selectionIds.has(line.id)))
  clearSelection()
}

const ensurePlayheadInView = () => {
  if (!props.autoFollow || !timelineScrollRef.value) return
  const view = timelineScrollRef.value
  view.scrollLeft = Math.max(0, playheadX.value - view.clientWidth / 2)
}

const onTimelineScroll = () => {
  if (syncingScroll || !timelineScrollRef.value || !headerScrollRef.value) return
  syncingScroll = true
  headerScrollRef.value.scrollLeft = timelineScrollRef.value.scrollLeft
  syncingScroll = false
}

const onHeaderScroll = () => {
  if (syncingScroll || !timelineScrollRef.value || !headerScrollRef.value) return
  syncingScroll = true
  timelineScrollRef.value.scrollLeft = headerScrollRef.value.scrollLeft
  syncingScroll = false
}

const onHeaderPointerDown = (event: PointerEvent) => {
  if (event.button !== 0 || !headerScrollRef.value) return
  const rect = headerScrollRef.value.getBoundingClientRect()
  updatePlayheadFromX(event.clientX - rect.left + headerScrollRef.value.scrollLeft)
  headerDragActive.value = true
  window.addEventListener('pointermove', onHeaderPointerMove)
  window.addEventListener('pointerup', onHeaderPointerUp)
}
const onHeaderPointerMove = (event: PointerEvent) => {
  if (!headerDragActive.value || !headerScrollRef.value) return
  const rect = headerScrollRef.value.getBoundingClientRect()
  updatePlayheadFromX(event.clientX - rect.left + headerScrollRef.value.scrollLeft)
}
const onHeaderPointerUp = () => {
  headerDragActive.value = false
  window.removeEventListener('pointermove', onHeaderPointerMove)
  window.removeEventListener('pointerup', onHeaderPointerUp)
}

const onTrackHoverMove = (event: PointerEvent) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  hoverState.x = Math.max(0, Math.min(event.clientX - rect.left, timelineWidth.value))
  hoverState.active = true
}
const onTrackHoverLeave = () => {
  hoverState.active = false
}

const onTimelineWheel = (event: WheelEvent) => {
  if (!event.ctrlKey) return
  event.preventDefault()
  zoomLevel.value = Math.max(5, Math.min(160, zoomLevel.value + (event.deltaY < 0 ? 5 : -5)))
}

const onKeyDown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
  const key = event.key.toLowerCase()
  const meta = event.metaKey || event.ctrlKey
  if (meta && key === 'z') {
    event.preventDefault()
    event.shiftKey ? redo() : undo()
  } else if (key === 'delete' || key === 'backspace') {
    event.preventDefault()
    removeSelected()
  } else if (key === ' ' && !event.shiftKey) {
    event.preventDefault()
    emit('toggle-play')
  } else if (key === '+' || key === '=') {
    event.preventDefault()
    zoomLevel.value = Math.min(160, zoomLevel.value + 10)
  } else if (key === '-' || key === '_') {
    event.preventDefault()
    zoomLevel.value = Math.max(5, zoomLevel.value - 10)
  }
}

watch(
  () => props.playheadMs,
  () => {
    if (props.isPlaying) ensurePlayheadInView()
  },
)

onMounted(() => {
  undoStack.value.push(snapshot())
  window.addEventListener('keydown', onKeyDown)
  timelineScrollRef.value?.addEventListener('wheel', onTimelineWheel, { passive: false })
  headerScrollRef.value?.addEventListener('wheel', onTimelineWheel, { passive: false })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  timelineScrollRef.value?.removeEventListener('wheel', onTimelineWheel)
  headerScrollRef.value?.removeEventListener('wheel', onTimelineWheel)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointermove', onBoxMove)
  window.removeEventListener('pointerup', onBoxUp)
  window.removeEventListener('pointermove', onPlayheadMove)
  window.removeEventListener('pointerup', onPlayheadUp)
  window.removeEventListener('pointermove', onHeaderPointerMove)
  window.removeEventListener('pointerup', onHeaderPointerUp)
})
</script>
