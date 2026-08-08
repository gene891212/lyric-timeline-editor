import { computed, onBeforeUnmount, ref } from 'vue'
import type { MediaMode } from '../types'

type YouTubePlayer = {
  loadVideoById: (id: string) => void
  cueVideoById?: (id: string) => void
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime?: () => number
  getDuration?: () => number
  getPlayerState?: () => number
  setPlaybackRate?: (rate: number) => void
  destroy?: () => void
}

type YouTubeApi = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer
  PlayerState: { PLAYING: number }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
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
  return /^[a-zA-Z0-9_-]{6,}$/.test(url) ? url : ''
}

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-youtube-api]')
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    if (existing) return
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.dataset.youtubeApi = '1'
    document.head.appendChild(script)
  })
}

export const useMediaController = () => {
  const mode = ref<MediaMode>('none')
  const youtubeUrl = ref('')
  const youtubeVideoId = ref('')
  const audioElement = ref<HTMLAudioElement | null>(null)
  const youtubeElement = ref<HTMLElement | null>(null)
  const currentTimeMs = ref(0)
  const durationMs = ref(0)
  const playbackRate = ref(1)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const errorMessage = ref('')
  const hasMedia = computed(() => mode.value !== 'none')
  const youtubeReady = ref(false)

  let youtubePlayer: YouTubePlayer | null = null
  const destroyYouTubePlayer = () => {
    youtubePlayer?.destroy?.()
    youtubePlayer = null
    youtubeReady.value = false
  }
  let objectUrl = ''
  let raf = 0

  const stopTicker = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  const updatePosition = () => {
    if (mode.value === 'local' && audioElement.value) {
      currentTimeMs.value = Math.round(audioElement.value.currentTime * 1000)
      durationMs.value = Number.isFinite(audioElement.value.duration)
        ? Math.round(audioElement.value.duration * 1000)
        : durationMs.value
    }
    if (mode.value === 'youtube' && youtubePlayer) {
      currentTimeMs.value = Math.round((youtubePlayer.getCurrentTime?.() ?? 0) * 1000)
      durationMs.value = Math.round((youtubePlayer.getDuration?.() ?? 0) * 1000)
    }
    if (isPlaying.value) raf = requestAnimationFrame(updatePosition)
  }

  const startTicker = () => {
    stopTicker()
    raf = requestAnimationFrame(updatePosition)
  }

  const pause = () => {
    audioElement.value?.pause()
    youtubePlayer?.pauseVideo()
    isPlaying.value = false
    stopTicker()
  }

  const play = async () => {
    errorMessage.value = ''
    if (mode.value === 'local' && audioElement.value) {
      try {
        await audioElement.value.play()
        isPlaying.value = true
        startTicker()
      } catch {
        errorMessage.value = '本機音檔無法播放，請確認瀏覽器權限。'
      }
      return isPlaying.value
    }
    if (mode.value === 'youtube' && youtubePlayer && youtubeReady.value) {
      youtubePlayer.playVideo()
      isPlaying.value = true
      startTicker()
      return true
    }
    return false
  }

  const toggle = async () => {
    if (isPlaying.value) {
      pause()
      return false
    }
    return play()
  }

  const seek = (ms: number) => {
    const next = Math.max(0, Math.round(ms))
    currentTimeMs.value = next
    if (mode.value === 'local' && audioElement.value) audioElement.value.currentTime = next / 1000
    if (mode.value === 'youtube' && youtubePlayer) youtubePlayer.seekTo(next / 1000, true)
  }

  const setPlaybackRate = (rate: number) => {
    playbackRate.value = Math.max(0.5, Math.min(2, Math.round(rate * 10) / 10))
    if (audioElement.value) audioElement.value.playbackRate = playbackRate.value
    youtubePlayer?.setPlaybackRate?.(playbackRate.value)
  }

  const setMode = (nextMode: MediaMode) => {
    pause()
    if (mode.value === 'youtube' && nextMode !== 'youtube') destroyYouTubePlayer()
    mode.value = nextMode
    if (nextMode !== 'youtube') youtubeVideoId.value = ''
    if (nextMode === 'none') {
      currentTimeMs.value = 0
      durationMs.value = 0
    }
  }

  const attachAudio = (element: HTMLAudioElement | null) => {
    audioElement.value = element
    if (element) {
      element.addEventListener('ended', pause)
      element.playbackRate = playbackRate.value
    }
  }

  const loadLocalFile = (file: File) => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = URL.createObjectURL(file)
    if (!audioElement.value) return
    audioElement.value.src = objectUrl
    audioElement.value.load()
    setMode('local')
  }

  const loadYouTube = async (url: string) => {
    const id = extractYouTubeId(url)
    if (!id) {
      errorMessage.value = '請輸入有效的 YouTube 網址。'
      return false
    }
    errorMessage.value = ''
    youtubeUrl.value = url
    youtubeVideoId.value = id
    setMode('youtube')
    isLoading.value = true
    await loadYouTubeApi()
    if (!youtubeElement.value || !window.YT?.Player) {
      isLoading.value = false
      errorMessage.value = 'YouTube 播放器尚未準備完成。'
      return false
    }

    if (youtubePlayer) {
      youtubePlayer.loadVideoById(id)
      youtubeReady.value = true
      isLoading.value = false
      return true
    }

    youtubePlayer = new window.YT.Player(youtubeElement.value, {
      height: '100%',
      width: '100%',
      videoId: id,
      playerVars: { playsinline: 1, controls: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: () => {
          youtubeReady.value = true
          isLoading.value = false
          durationMs.value = Math.round((youtubePlayer?.getDuration?.() ?? 0) * 1000)
          youtubePlayer?.setPlaybackRate?.(playbackRate.value)
        },
        onStateChange: (event: { data: number }) => {
          const playing = event.data === window.YT?.PlayerState.PLAYING
          isPlaying.value = playing
          if (playing) startTicker()
          else stopTicker()
        },
      },
    })
    return true
  }

  const stop = () => {
    pause()
    seek(0)
  }

  const dispose = () => {
    stopTicker()
    audioElement.value?.removeEventListener('ended', pause)
    destroyYouTubePlayer()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }

  onBeforeUnmount(dispose)

  return {
    mode,
    youtubeUrl,
    youtubeVideoId,
    audioElement,
    youtubeElement,
    currentTimeMs,
    durationMs,
    playbackRate,
    isPlaying,
    isLoading,
    errorMessage,
    hasMedia,
    attachAudio,
    loadLocalFile,
    loadYouTube,
    setMode,
    play,
    pause,
    toggle,
    seek,
    setPlaybackRate,
    stop,
    dispose,
  }
}
