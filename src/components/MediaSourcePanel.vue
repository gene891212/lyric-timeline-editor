<template>
  <section class="card">
    <div class="row-between">
      <h2 class="card-title"><span class="title-icon">◉</span>音訊 / 影片來源</h2>
    </div>
    <div class="seg" role="tablist">
      <button
        v-for="option in mediaOptions"
        :key="option.value"
        :class="{ 'is-active': media.mode.value === option.value }"
        type="button"
        role="tab"
        :aria-selected="media.mode.value === option.value"
        @click="emit('select-mode', option.value)"
      >{{ option.label }}</button>
    </div>

    <div v-if="media.mode.value === 'none'" class="empty-state">
      <span class="empty-state-icon">♧</span>
      <p>純文字編輯模式</p>
      <p class="empty-state-note">可隨時切換至 YouTube 或本機音檔配樂</p>
    </div>

    <form v-else-if="media.mode.value === 'youtube'" class="col-gap" @submit.prevent="loadYouTubeVideo">
      <label class="field-label" for="youtube-url">YouTube 網址</label>
      <div class="row">
        <input id="youtube-url" v-model="youtubeInput" class="input" type="url" placeholder="貼上 YouTube 網址…" />
        <button class="btn btn-primary" type="submit">{{ media.isLoading.value ? '載入中' : '載入' }}</button>
      </div>
      <div class="yt-frame">
        <div ref="youtubeMount" class="youtube-player"></div>
        <div v-if="!media.youtubeVideoId.value" class="yt-placeholder">
          <span class="empty-state-icon">▶</span>
          <p>輸入 YouTube 影片網址並點擊載入</p>
          <p class="url-example">https://youtube.com/watch?v=…</p>
        </div>
      </div>
    </form>

    <div v-else class="col-gap">
      <label class="field-label" for="audio-upload">本機音檔</label>
      <label class="drop-zone" for="audio-upload">
        <span class="drop-icon">↥</span>
        <strong>{{ localFileName || '選擇音樂檔案' }}</strong>
        <span>支援 MP3、WAV、M4A 等格式</span>
        <input id="audio-upload" type="file" accept="audio/*" @change="handleAudioUpload" />
      </label>
      <audio ref="audioRef" class="audio-player" controls></audio>
    </div>

    <p v-if="media.errorMessage.value" class="inline-error" role="alert">{{ media.errorMessage.value }}</p>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { MediaMode } from '../types'
import type { useMediaController } from '../composables/useMediaController'

const props = defineProps<{ media: ReturnType<typeof useMediaController> }>()
const emit = defineEmits<{
  (event: 'select-mode', mode: MediaMode): void
  (event: 'status', message: string): void
}>()

const mediaOptions: Array<{ value: MediaMode; label: string }> = [
  { value: 'none', label: '無媒體' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'local', label: '本機音檔' },
]

const localFileName = ref('')
const youtubeInput = ref('')
const audioRef = ref<HTMLAudioElement | null>(null)
const youtubeMount = ref<HTMLElement | null>(null)

const extractYouTubeId = (value: string) => {
  const url = value.trim()
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/)
  const embed = url.match(/\/embed\/([a-zA-Z0-9_-]{6,})/)
  return short?.[1] ?? watch?.[1] ?? embed?.[1] ?? (/^[a-zA-Z0-9_-]{6,}$/.test(url) ? url : '')
}

const loadYouTubeVideo = async () => {
  const id = extractYouTubeId(youtubeInput.value)
  if (!id) {
    emit('status', '請輸入有效的 YouTube 網址')
    return
  }
  props.media.setMode('youtube')
  props.media.youtubeVideoId.value = id
  await nextTick()
  props.media.youtubeElement.value = youtubeMount.value
  if (await props.media.loadYouTube(youtubeInput.value)) emit('status', 'YouTube 影片已載入')
}

const handleAudioUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  localFileName.value = file.name
  props.media.loadLocalFile(file)
  emit('status', '已載入 ' + file.name)
}

watch(audioRef, (element) => props.media.attachAudio(element), { immediate: true })
</script>
