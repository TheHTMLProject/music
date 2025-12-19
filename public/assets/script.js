window.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audioPlayer')
  const playIcon = document.getElementById('playIcon')
  const favIcon = document.getElementById('favIcon')
  const volumeSlider = document.getElementById('volumeSlider')
  const muteBtn = document.getElementById('muteBtn')
  const muteIcon = document.getElementById('muteIcon')

  const songTitle = document.getElementById('songTitle')
  const artistName = document.getElementById('artistName')
  const statusText = document.getElementById('statusText')

  const albumArtContainer = document.getElementById('albumArtContainer')
  const bodyAmbient = document.getElementById('bodyAmbient')

  const favBtn = document.getElementById('favBtn')
  const prevBtn = document.getElementById('prevBtn')
  const playBtn = document.getElementById('playBtn')
  const nextBtn = document.getElementById('nextBtn')

  const progressBar = document.getElementById('progressBar')
  const progress = document.getElementById('progress')
  const progressThumb = document.getElementById('progressThumb')
  const currentTimeEl = document.getElementById('currentTime')
  const durationEl = document.getElementById('duration')

  const searchInput = document.getElementById('searchInput')
  const searchBtn = document.getElementById('searchBtn')
  const searchLoading = document.getElementById('searchLoading')
  const searchResults = document.getElementById('searchResults')

  const lyricsContainer = document.getElementById('lyricsContainer')
  const favoritesResults = document.getElementById('favoritesResults')

  let currentSong = null
  let queue = []
  let queueIndex = -1
  let queueMode = 'search'
  let favorites = []
  let isScrubbing = false
  let wasPlayingBeforeScrub = false
  let lastVolume = 0.7

  function fmtTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function setStatus(text) {
    statusText.textContent = text || ''
  }

  function setArtwork(url) {
    albumArtContainer.innerHTML = ''
    if (!url) {
      const icon = document.createElement('span')
      icon.className = 'material-symbols-outlined album-icon'
      icon.textContent = 'music_note'
      albumArtContainer.appendChild(icon)
      bodyAmbient.style.backgroundImage = ''
      bodyAmbient.classList.remove('active')
      return
    }
    const img = document.createElement('img')
    img.src = url
    img.alt = ''
    albumArtContainer.appendChild(img)
    bodyAmbient.style.backgroundImage = `url("${url}")`
    bodyAmbient.classList.add('active')
  }

  function loadFavorites() {
    const raw = localStorage.getItem('music-favorites')
    if (!raw) return []
    try {
      const arr = JSON.parse(raw)
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }

  function saveFavorites() {
    localStorage.setItem('music-favorites', JSON.stringify(favorites))
  }

  function updateFavoriteIcon() {
    const fav = favorites.some(s => s.trackId === currentSong?.trackId)
    favIcon.textContent = fav ? 'favorite' : 'favorite_border'
    favBtn.classList.toggle('is-favorite', fav)
  }

  function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'))
    const panel = document.getElementById(tab + 'Tab')
    if (panel) panel.classList.add('active')
    const btn = document.querySelector(`[data-tab="${tab}"]`)
    if (btn) btn.classList.add('active')
    if (tab === 'favorites') renderFavorites()
  }

  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab))
  })

  function renderSearch(songs) {
    searchResults.innerHTML = ''
    songs.forEach(song => {
      const row = document.createElement('div')
      row.className = 'list-item'

      const art = document.createElement('img')
      art.className = 'list-art'
      art.src = song.artworkUrl60 || song.artworkUrl100 || ''
      art.alt = ''

      const meta = document.createElement('div')
      meta.className = 'list-meta'

      const title = document.createElement('div')
      title.className = 'list-title'
      title.textContent = song.trackName || 'Unknown'

      const sub = document.createElement('div')
      sub.className = 'list-subtitle'
      sub.textContent = song.artistName || ''

      meta.appendChild(title)
      meta.appendChild(sub)

      const actions = document.createElement('div')
      actions.className = 'list-actions'

      const play = document.createElement('button')
      play.className = 'icon-btn'
      play.type = 'button'
      play.setAttribute('aria-label', 'Play')
      const playGlyph = document.createElement('span')
      playGlyph.className = 'material-symbols-outlined'
      playGlyph.textContent = 'play_arrow'
      play.appendChild(playGlyph)

      play.addEventListener('click', e => {
        e.stopPropagation()
        queueMode = 'search'
        playSong(song)
        showTab('player')
      })

      actions.appendChild(play)

      row.appendChild(art)
      row.appendChild(meta)
      row.appendChild(actions)

      row.addEventListener('click', () => {
        queueMode = 'search'
        playSong(song)
        showTab('player')
      })

      searchResults.appendChild(row)
    })
  }

  function searchSongs() {
    const q = searchInput.value.trim()
    if (!q) return
    searchLoading.classList.add('active')
    searchResults.innerHTML = ''
    fetch(`/music/meta?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => {
        const items = Array.isArray(d.results) ? d.results : []
        queueMode = 'search'
        queue = items
        renderSearch(items)
      })
      .catch(() => {
        queue = []
        searchResults.innerHTML = ''
      })
      .finally(() => {
        searchLoading.classList.remove('active')
      })
  }

  function syncPlayUI() {
    const playing = !audio.paused && !audio.ended
    playIcon.textContent = playing ? 'pause' : 'play_arrow'
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play')
  }

  function updateMuteGlyph() {
    const muted = audio.muted || audio.volume === 0
    muteIcon.textContent = muted ? 'volume_off' : 'volume_up'
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute')
  }

  function updateVolumeSliderTrack() {
    const value = Math.max(0, Math.min(100, Number(volumeSlider.value)))
    const root = document.documentElement
    const track = getComputedStyle(root).getPropertyValue('--track-bg').trim() || '#888888'
    const brand = getComputedStyle(root).getPropertyValue('--brand').trim() || '#3cab64'
    volumeSlider.style.background = `linear-gradient(to right, ${brand} 0%, ${brand} ${value}%, ${track} ${value}%, ${track} 100%)`
  }

  function setVolumeFromSlider() {
    const v = Math.max(0, Math.min(1, Number(volumeSlider.value) / 100))
    audio.volume = v
    if (v > 0) lastVolume = v
    audio.muted = v === 0
    updateMuteGlyph()
    updateVolumeSliderTrack()
  }

  function toggleMute() {
    if (!audio.muted && audio.volume > 0) {
      lastVolume = audio.volume
      audio.muted = true
      audio.volume = 0
      volumeSlider.value = 0
      updateMuteGlyph()
      updateVolumeSliderTrack()
      return
    }
    audio.muted = false
    const v = lastVolume > 0 ? lastVolume : 0.7
    audio.volume = v
    volumeSlider.value = Math.round(v * 100)
    updateMuteGlyph()
    updateVolumeSliderTrack()
  }

  function buildSearchQueryFromSong(song) {
    const parts = []
    if (song.trackName) parts.push(song.trackName)
    if (song.artistName) parts.push(song.artistName)
    if (!parts.length && song.collectionName) parts.push(song.collectionName)
    return parts.join(' - ')
  }

  function getVideoIdForSong(song) {
    if (song.videoId) return Promise.resolve(song.videoId)
    const q = buildSearchQueryFromSong(song)
    if (!q) return Promise.reject(new Error('no-query'))
    return fetch(`/music/search?q=${encodeURIComponent(q)}`)
      .then(r => {
        if (!r.ok) throw new Error('search-failed')
        return r.json()
      })
      .then(d => {
        if (d && d.videoId) {
          song.videoId = d.videoId
          return d.videoId
        }
        throw new Error('no-video-id')
      })
  }

  function resetLyrics() {
    lyricsContainer.classList.remove('has-lyrics')
    lyricsContainer.textContent = 'No lyrics available for this track'
  }

  function loadLyricsForSong(song) {
    resetLyrics()
    if (!song || !song.trackName || !song.artistName) return
    const artist = encodeURIComponent(song.artistName)
    const title = encodeURIComponent(song.trackName)
    lyricsContainer.textContent = 'Loading lyrics…'
    fetch(`https://api.lyrics.ovh/v1/${artist}/${title}`)
      .then(r => {
        if (!r.ok) throw new Error('lyrics-failed')
        return r.json()
      })
      .then(data => {
        if (data && data.lyrics) {
          lyricsContainer.textContent = data.lyrics
          lyricsContainer.classList.add('has-lyrics')
        } else {
          resetLyrics()
        }
      })
      .catch(() => {
        resetLyrics()
      })
  }

  function playSong(song) {
    if (!song) return
    setStatus('Loading…')
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    currentSong = song
    queueIndex = queue.findIndex(s => s.trackId === song.trackId)
    songTitle.textContent = song.trackName || 'Unknown'
    artistName.textContent = song.artistName || ''
    setArtwork(song.artworkUrl100 || song.artworkUrl60 || '')
    updateFavoriteIcon()
    resetLyrics()
    loadLyricsForSong(song)
    syncPlayUI()

    getVideoIdForSong(song)
      .then(videoId => {
        const src = `/music/stream?id=${encodeURIComponent(videoId)}`
        audio.src = src
        return audio.play()
      })
      .then(() => {
        setStatus('')
        syncPlayUI()
      })
      .catch(() => {
        setStatus('Unable to play this track')
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        syncPlayUI()
      })
  }

  function togglePlay() {
    if (!audio.src) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
    syncPlayUI()
  }

  function prevSong() {
    if (!queue.length) return
    if (queueIndex <= 0) return
    const s = queue[queueIndex - 1]
    if (s) playSong(s)
  }

  function nextSong() {
    if (!queue.length) return
    if (queueIndex < 0) return
    if (queueIndex >= queue.length - 1) return
    const s = queue[queueIndex + 1]
    if (s) playSong(s)
  }

  function toggleFavorite() {
    if (!currentSong) return
    const i = favorites.findIndex(s => s.trackId === currentSong.trackId)
    if (i > -1) favorites.splice(i, 1)
    else favorites.push(currentSong)
    saveFavorites()
    updateFavoriteIcon()
    if (queueMode === 'favorites') {
      queue = favorites.slice()
      queueIndex = queue.findIndex(s => s.trackId === currentSong.trackId)
    }
  }

  function renderFavorites() {
    favoritesResults.innerHTML = ''
    if (!favorites.length) {
      favoritesResults.classList.remove('has-items')
      favoritesResults.textContent = 'No favorites yet'
      return
    }
    favoritesResults.classList.add('has-items')
    favorites.forEach(song => {
      const row = document.createElement('div')
      row.className = 'list-item'
      const art = document.createElement('img')
      art.className = 'list-art'
      art.src = song.artworkUrl60 || song.artworkUrl100 || ''
      art.alt = ''
      const meta = document.createElement('div')
      meta.className = 'list-meta'
      const title = document.createElement('div')
      title.className = 'list-title'
      title.textContent = song.trackName || 'Unknown'
      const sub = document.createElement('div')
      sub.className = 'list-subtitle'
      sub.textContent = song.artistName || ''
      meta.appendChild(title)
      meta.appendChild(sub)
      const actions = document.createElement('div')
      actions.className = 'list-actions'
      const play = document.createElement('button')
      play.className = 'icon-btn'
      play.type = 'button'
      play.setAttribute('aria-label', 'Play')
      const playGlyph = document.createElement('span')
      playGlyph.className = 'material-symbols-outlined'
      playGlyph.textContent = 'play_arrow'
      play.appendChild(playGlyph)
      const unfav = document.createElement('button')
      unfav.className = 'icon-btn'
      unfav.type = 'button'
      unfav.setAttribute('aria-label', 'Remove favorite')
      const unfavGlyph = document.createElement('span')
      unfavGlyph.className = 'material-symbols-outlined'
      unfavGlyph.textContent = 'delete'
      unfav.appendChild(unfavGlyph)

      play.addEventListener('click', e => {
        e.stopPropagation()
        queueMode = 'favorites'
        queue = favorites.slice()
        playSong(song)
        showTab('player')
      })

      unfav.addEventListener('click', e => {
        e.stopPropagation()
        favorites = favorites.filter(s => s.trackId !== song.trackId)
        saveFavorites()
        updateFavoriteIcon()
        if (queueMode === 'favorites') {
          queue = favorites.slice()
          queueIndex = queue.findIndex(s => s.trackId === currentSong?.trackId)
        }
        renderFavorites()
      })

      actions.appendChild(play)
      actions.appendChild(unfav)
      row.appendChild(art)
      row.appendChild(meta)
      row.appendChild(actions)

      row.addEventListener('click', () => {
        queueMode = 'favorites'
        queue = favorites.slice()
        playSong(song)
        showTab('player')
      })

      favoritesResults.appendChild(row)
    })
  }

  function setProgressPct(pct) {
    const clamped = Math.min(100, Math.max(0, pct))
    progress.style.width = `${clamped}%`
    progressThumb.style.left = `${clamped}%`
  }

  function syncProgressUI() {
    const dur = audio.duration
    const cur = audio.currentTime
    durationEl.textContent = fmtTime(dur)
    currentTimeEl.textContent = fmtTime(cur)
    if (Number.isFinite(dur) && dur > 0) {
      const pct = (cur / dur) * 100
      setProgressPct(pct)
    } else {
      setProgressPct(0)
    }
  }

  function seekToClientX(clientX) {
    const dur = audio.duration
    if (!Number.isFinite(dur) || dur <= 0) return
    const rect = progressBar.getBoundingClientRect()
    if (!rect.width) return
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const t = dur * pct
    audio.currentTime = t
    currentTimeEl.textContent = fmtTime(t)
    setProgressPct(pct * 100)
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!audio.src) return
    e.preventDefault()
    isScrubbing = true
    wasPlayingBeforeScrub = !audio.paused && !audio.ended
    try { audio.pause() } catch {}
    if (progressBar.setPointerCapture) {
      try { progressBar.setPointerCapture(e.pointerId) } catch {}
    }
    seekToClientX(e.clientX)
  }

  function onPointerMove(e) {
    if (!isScrubbing) return
    e.preventDefault()
    seekToClientX(e.clientX)
  }

  function onPointerUp(e) {
    if (!isScrubbing) return
    e.preventDefault()
    isScrubbing = false
    if (progressBar.releasePointerCapture) {
      try { progressBar.releasePointerCapture(e.pointerId) } catch {}
    }
    if (wasPlayingBeforeScrub) {
      audio.play().catch(() => {})
    }
  }

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchSongs()
  })

  searchBtn.addEventListener('click', searchSongs)

  favBtn.addEventListener('click', toggleFavorite)
  playBtn.addEventListener('click', togglePlay)
  prevBtn.addEventListener('click', prevSong)
  nextBtn.addEventListener('click', nextSong)

  muteBtn.addEventListener('click', toggleMute)
  volumeSlider.addEventListener('input', setVolumeFromSlider)

  audio.addEventListener('play', () => { syncPlayUI() })
  audio.addEventListener('playing', () => { syncPlayUI() })
  audio.addEventListener('pause', () => { syncPlayUI() })
  audio.addEventListener('ended', () => { syncPlayUI(); nextSong() })
  audio.addEventListener('timeupdate', () => { if (!isScrubbing) syncProgressUI() })
  audio.addEventListener('loadedmetadata', () => { syncProgressUI() })
  audio.addEventListener('durationchange', () => { syncProgressUI() })
  audio.addEventListener('volumechange', () => { updateMuteGlyph(); updateVolumeSliderTrack() })
  audio.addEventListener('error', () => {
    if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      setStatus('Unable to play this track')
      syncPlayUI()
    }
  })

  progressBar.addEventListener('pointerdown', onPointerDown)
  progressBar.addEventListener('pointermove', onPointerMove)
  progressBar.addEventListener('pointerup', onPointerUp)
  progressBar.addEventListener('pointercancel', onPointerUp)

  favorites = loadFavorites()
  const v = Math.max(0, Math.min(1, Number(volumeSlider.value) / 100))
  audio.volume = v
  lastVolume = v > 0 ? v : 0.7
  audio.muted = v === 0
  syncPlayUI()
  updateMuteGlyph()
  updateVolumeSliderTrack()
  updateFavoriteIcon()
  setArtwork('')
  setStatus('')
  setProgressPct(0)
})
