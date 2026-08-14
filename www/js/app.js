/* ==========================================================================
   SoundPulse Main Application Orchestrator
   ========================================================================== */

import { AudioEngine, EQ_FREQUENCIES } from './audio-engine.js';
import { AudioVisualizer } from './visualizer.js';
import { TagParser } from './tag-parser.js';
import { LyricsParser } from './lyrics-parser.js';
import { StorageService } from './storage.js';
import { SynthDemoGenerator } from './synth-demo.js';

class SoundPulseApp {
  constructor() {
    this.audioEngine = new AudioEngine();
    this.visualizer = null;

    this.tracks = [];
    this.currentTrackIndex = -1;
    this.favorites = StorageService.getFavorites();

    this.currentLyrics = [];
    this.activeLyricIndex = -1;

    this.isShuffle = false;
    this.repeatMode = 'off'; // 'off' | 'all' | 'one'
    this.speed = 1.0;

    this.playlists = [];
    this.activePlaylistId = null;
    this.targetTrackForPlaylist = null;
    this.viewMode = localStorage.getItem('soundpulse_view_mode') || 'grid';

    this.initElements();
    this.initEventListeners();
    this.initEqualizerUI();
    this.loadTracksFromDB();
    this.loadPlaylistsFromDB();
    this.applyViewMode();
    this.initPWA();
  }

  initElements() {
    // Navigation & Tabs
    this.navButtons = document.querySelectorAll('.nav-item');
    this.tabPages = document.querySelectorAll('.tab-page');

    // Drag Drop & Inputs
    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.folderInput = document.getElementById('folderInput');
    this.btnImportFiles = document.getElementById('btnImportFiles');
    this.btnImportFolder = document.getElementById('btnImportFolder');

    // Header Controls
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    this.btnToggleLayout = document.getElementById('btnToggleLayout');

    // Track Containers
    this.trackList = document.getElementById('trackList');
    this.emptyState = document.getElementById('emptyState');
    this.statTrackCount = document.getElementById('statTrackCount');

    // Player Bar Elements
    this.playerTitle = document.getElementById('playerTitle');
    this.playerArtist = document.getElementById('playerArtist');
    this.playerCoverArt = document.getElementById('playerCoverArt');
    this.vinylDisc = document.getElementById('vinylDisc');
    this.btnToggleFavorite = document.getElementById('btnToggleFavorite');

    // Controls
    this.btnPlayPause = document.getElementById('btnPlayPause');
    this.btnPrev = document.getElementById('btnPrev');
    this.btnNext = document.getElementById('btnNext');
    this.btnShuffle = document.getElementById('btnShuffle');
    this.btnRepeat = document.getElementById('btnRepeat');
    this.btnSpeed = document.getElementById('btnSpeed');
    this.btnMute = document.getElementById('btnMute');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.currentTimeEl = document.getElementById('currentTime');
    this.totalTimeEl = document.getElementById('totalTime');
    this.seekbar = document.getElementById('seekbar');
    this.seekbarProgress = document.getElementById('seekbarProgress');
    this.seekbarHandle = document.getElementById('seekbarHandle');

    // Quick Bar Navigation
    this.btnQuickEq = document.getElementById('btnQuickEq');
    this.btnQuickViz = document.getElementById('btnQuickViz');
    this.btnQuickLyrics = document.getElementById('btnQuickLyrics');

    // Visualizer Canvas
    this.visualizerCanvas = document.getElementById('visualizerCanvas');
    this.visualizer = new AudioVisualizer(this.visualizerCanvas, this.audioEngine);

    // Lyrics Elements
    this.lyricsCoverArt = document.getElementById('lyricsCoverArt');
    this.lyricsTrackTitle = document.getElementById('lyricsTrackTitle');
    this.lyricsTrackArtist = document.getElementById('lyricsTrackArtist');
    this.lyricsContent = document.getElementById('lyricsContent');
    this.btnLoadLrcFile = document.getElementById('btnLoadLrcFile');
    this.lrcFileInput = document.getElementById('lrcFileInput');

    // Ambient Glow
    this.ambientGlow = document.getElementById('ambientGlow');

    // Playlist UI & Modals
    this.playlistGrid = document.getElementById('playlistGrid');
    this.playlistListView = document.getElementById('playlistListView');
    this.playlistDetailView = document.getElementById('playlistDetailView');
    this.playlistDetailTitle = document.getElementById('playlistDetailTitle');
    this.playlistDetailSubtitle = document.getElementById('playlistDetailSubtitle');
    this.playlistTrackList = document.getElementById('playlistTrackList');
    this.btnBackToPlaylists = document.getElementById('btnBackToPlaylists');
    this.btnPlayPlaylist = document.getElementById('btnPlayPlaylist');
    this.btnDeletePlaylist = document.getElementById('btnDeletePlaylist');
    this.btnCreatePlaylist = document.getElementById('btnCreatePlaylist');

    this.modalCreatePlaylist = document.getElementById('modalCreatePlaylist');
    this.playlistNameInput = document.getElementById('playlistNameInput');
    this.btnConfirmCreatePlaylist = document.getElementById('btnConfirmCreatePlaylist');
    this.btnCancelCreatePlaylist = document.getElementById('btnCancelCreatePlaylist');
    this.btnCloseCreateModal = document.getElementById('btnCloseCreateModal');

    this.modalAddToPlaylist = document.getElementById('modalAddToPlaylist');
    this.addToPlaylistList = document.getElementById('addToPlaylistList');
    this.btnCloseAddToPlaylist = document.getElementById('btnCloseAddToPlaylist');
    this.btnCloseAddToModal = document.getElementById('btnCloseAddToModal');
  }

  initEventListeners() {
    // Navigation Tab Switching
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabTarget = btn.dataset.tab;
        this.switchTab(tabTarget);
      });
    });

    // Quick Player Bar Nav Shortcuts
    if (this.btnQuickEq) this.btnQuickEq.addEventListener('click', () => this.switchTab('equalizer'));
    if (this.btnQuickViz) this.btnQuickViz.addEventListener('click', () => this.switchTab('visualizer'));

    // Import File & Folder Buttons
    if (this.btnImportFiles) this.btnImportFiles.addEventListener('click', () => this.fileInput.click());
    if (this.btnImportFolder) this.btnImportFolder.addEventListener('click', () => this.folderInput.click());

    const btnHeaderImportFile = document.getElementById('btnHeaderImportFile');
    if (btnHeaderImportFile) btnHeaderImportFile.addEventListener('click', () => this.fileInput.click());

    const btnHeaderImportFolder = document.getElementById('btnHeaderImportFolder');
    if (btnHeaderImportFolder) btnHeaderImportFolder.addEventListener('click', () => this.folderInput.click());

    this.fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));
    this.folderInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));

    // Global Drag & Drop on window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        this.handleFileSelection(e.dataTransfer.files);
      }
    });

    // Playlist Modals & Actions
    if (this.btnCreatePlaylist) this.btnCreatePlaylist.addEventListener('click', () => this.openCreatePlaylistModal());
    if (this.btnConfirmCreatePlaylist) this.btnConfirmCreatePlaylist.addEventListener('click', () => this.handleConfirmCreatePlaylist());
    if (this.btnCancelCreatePlaylist) this.btnCancelCreatePlaylist.addEventListener('click', () => this.closeCreatePlaylistModal());
    if (this.btnCloseCreateModal) this.btnCloseCreateModal.addEventListener('click', () => this.closeCreatePlaylistModal());

    if (this.playlistNameInput) {
      this.playlistNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleConfirmCreatePlaylist();
      });
    }

    if (this.btnCloseAddToPlaylist) this.btnCloseAddToPlaylist.addEventListener('click', () => this.closeAddToPlaylistModal());
    if (this.btnCloseAddToModal) this.btnCloseAddToModal.addEventListener('click', () => this.closeAddToPlaylistModal());

    if (this.btnBackToPlaylists) this.btnBackToPlaylists.addEventListener('click', () => this.closePlaylistDetail());
    if (this.btnPlayPlaylist) this.btnPlayPlaylist.addEventListener('click', () => this.playActivePlaylist());
    if (this.btnDeletePlaylist) this.btnDeletePlaylist.addEventListener('click', () => this.handleDeleteActivePlaylist());

    // Search, Sort & View Mode
    this.searchInput.addEventListener('input', () => this.renderTracks());
    this.sortSelect.addEventListener('change', () => this.renderTracks());
    if (this.btnToggleLayout) {
      this.btnToggleLayout.addEventListener('click', () => this.toggleViewMode());
    }

    // Empty State Import Buttons
    const btnImportFileEmpty = document.getElementById('btnImportFileEmpty');
    if (btnImportFileEmpty) {
      btnImportFileEmpty.addEventListener('click', () => this.fileInput.click());
    }
    const btnImportFolderEmpty = document.getElementById('btnImportFolderEmpty');
    if (btnImportFolderEmpty) {
      btnImportFolderEmpty.addEventListener('click', () => this.folderInput.click());
    }

    // Playback Controls
    this.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
    this.btnPrev.addEventListener('click', () => this.playPrevious());
    this.btnNext.addEventListener('click', () => this.playNext());

    this.btnShuffle.addEventListener('click', () => {
      this.isShuffle = !this.isShuffle;
      this.btnShuffle.classList.toggle('active', this.isShuffle);
      this.showToast(this.isShuffle ? '🔀 Đã bật phát ngẫu nhiên' : '➡️ Tắt phát ngẫu nhiên');
    });

    this.btnRepeat.addEventListener('click', () => {
      if (this.repeatMode === 'off') {
        this.repeatMode = 'all';
        this.btnRepeat.classList.add('active');
        this.btnRepeat.classList.remove('repeat-one');
        this.btnRepeat.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        this.btnRepeat.title = 'Chế độ: Lặp lại tất cả bài hát';
        this.showToast('🔁 Chế độ: Lặp lại tất cả bài hát');
      } else if (this.repeatMode === 'all') {
        this.repeatMode = 'one';
        this.btnRepeat.classList.add('active', 'repeat-one');
        this.btnRepeat.innerHTML = '<i class="fa-solid fa-repeat"></i><span class="repeat-one-badge">1</span>';
        this.btnRepeat.title = 'Chế độ: Chỉ lặp lại bài hát này';
        this.showToast('🔂 Chế độ: Chỉ lặp lại bài hát này');
      } else {
        this.repeatMode = 'off';
        this.btnRepeat.classList.remove('active', 'repeat-one');
        this.btnRepeat.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        this.btnRepeat.title = 'Chế độ: Tắt lặp lại';
        this.showToast('➡️ Tắt lặp lại (Phát theo danh sách)');
      }
    });

    this.btnSpeed.addEventListener('click', () => {
      const speeds = [1.0, 1.25, 1.5, 2.0, 0.5, 0.75];
      const idx = speeds.indexOf(this.speed);
      this.speed = speeds[(idx + 1) % speeds.length];
      this.btnSpeed.textContent = `${this.speed}x`;
      this.audioEngine.setSpeed(this.speed);
    });

    // Volume & Mute
    this.volumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.audioEngine.setVolume(val);
      this.updateVolumeIcon(val);
    });

    this.btnMute.addEventListener('click', () => {
      if (this.audioEngine.audioElement.volume > 0) {
        this.previousVolume = this.audioEngine.audioElement.volume;
        this.audioEngine.setVolume(0);
        this.volumeSlider.value = 0;
        this.updateVolumeIcon(0);
      } else {
        const val = this.previousVolume || 0.8;
        this.audioEngine.setVolume(val);
        this.volumeSlider.value = val;
        this.updateVolumeIcon(val);
      }
    });

    // Seekbar Interactions
    this.seekbar.addEventListener('click', (e) => {
      const rect = this.seekbar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = clickX / rect.width;
      const duration = this.audioEngine.audioElement.duration || 0;
      this.audioEngine.seek(ratio * duration);
    });

    // Favorites Toggle
    this.btnToggleFavorite.addEventListener('click', () => {
      if (this.currentTrackIndex < 0) return;
      const track = this.tracks[this.currentTrackIndex];
      const favIdx = this.favorites.indexOf(track.id);
      if (favIdx >= 0) {
        this.favorites.splice(favIdx, 1);
        this.btnToggleFavorite.classList.remove('active');
      } else {
        this.favorites.push(track.id);
        this.btnToggleFavorite.classList.add('active');
      }
      StorageService.saveFavorites(this.favorites);
      this.renderTracks();
    });

    // Audio Engine Updates
    this.audioEngine.onTimeUpdateCallback = (current, duration) => {
      this.updateTimeAndProgress(current, duration);
      this.updateLyricsHighlight(current);
    };

    this.audioEngine.onEndedCallback = () => {
      if (this.repeatMode === 'one') {
        this.audioEngine.seek(0);
        this.audioEngine.play();
        this.showToast('🔂 Phát lại bài hiện tại');
      } else {
        this.playNext();
      }
    };

    // Visualizer Buttons
    document.querySelectorAll('.viz-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.viz-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.visualizer.setMode(btn.dataset.mode);
      });
    });

    // LRC File Selection for Lyrics
    this.btnLoadLrcFile.addEventListener('click', () => this.lrcFileInput.click());
    this.lrcFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        const text = await e.target.files[0].text();
        this.currentLyrics = LyricsParser.parseLRC(text);
        this.renderLyrics();
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        this.audioEngine.seek(this.audioEngine.audioElement.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        this.audioEngine.seek(this.audioEngine.audioElement.currentTime - 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const v = Math.min(1, this.audioEngine.audioElement.volume + 0.1);
        this.audioEngine.setVolume(v);
        this.volumeSlider.value = v;
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const v = Math.max(0, this.audioEngine.audioElement.volume - 0.1);
        this.audioEngine.setVolume(v);
        this.volumeSlider.value = v;
      }
    });
  }

  switchTab(tabId) {
    this.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    this.tabPages.forEach(page => {
      page.classList.toggle('active', page.id === `tab-${tabId}`);
    });

    if (tabId === 'visualizer') {
      this.visualizer.resizeCanvas();
      this.visualizer.start();
    }
  }

  initEqualizerUI() {
    const container = document.getElementById('eqBandsContainer');
    container.innerHTML = '';

    EQ_FREQUENCIES.forEach((freq, idx) => {
      const freqLabel = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;

      const col = document.createElement('div');
      col.className = 'eq-band-col';
      col.innerHTML = `
        <span class="eq-val-label" id="eqVal_${idx}">0dB</span>
        <div class="eq-slider-wrapper">
          <input type="range" class="eq-slider" id="eqSlider_${idx}" min="-12" max="12" value="0" step="0.5">
        </div>
        <span class="eq-freq-label">${freqLabel}Hz</span>
      `;
      container.appendChild(col);

      const slider = col.querySelector('.eq-slider');
      const valLabel = col.querySelector('.eq-val-label');

      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valLabel.textContent = `${val > 0 ? '+' : ''}${val}dB`;
        this.audioEngine.setEqBandGain(idx, val);
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      });
    });

    // Preset Buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const presetKey = btn.dataset.preset;
        this.audioEngine.applyPreset(presetKey);

        const gains = this.audioEngine.eqNodes.map(n => n.gain.value);
        gains.forEach((g, idx) => {
          const slider = document.getElementById(`eqSlider_${idx}`);
          const valLabel = document.getElementById(`eqVal_${idx}`);
          if (slider && valLabel) {
            slider.value = g;
            valLabel.textContent = `${g > 0 ? '+' : ''}${g}dB`;
          }
        });
      });
    });

    // Preamp Slider
    const preampSlider = document.getElementById('preampGain');
    const preampValLabel = document.getElementById('preampGainValue');
    preampSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      preampValLabel.textContent = `${v > 0 ? '+' : ''}${v} dB`;
      this.audioEngine.setPreamp(v);
    });

    // Enable/Disable Toggle
    document.getElementById('eqEnableToggle').addEventListener('change', (e) => {
      this.audioEngine.setEqEnabled(e.target.checked);
    });
  }

  async handleFileSelection(files) {
    if (!files || files.length === 0) return;

    // Detect if imported from a folder
    let detectedFolderName = null;
    if (files[0] && files[0].webkitRelativePath) {
      const parts = files[0].webkitRelativePath.split('/');
      if (parts.length > 1 && parts[0].trim()) {
        detectedFolderName = parts[0].trim();
      }
    }

    const importedTrackIds = [];
    for (let file of files) {
      if (!file.type.startsWith('audio/') && !/\.(mp3|wav|flac|m4a|ogg|aac)$/i.test(file.name)) {
        continue;
      }

      const meta = await TagParser.parseFile(file);
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const trackUrl = URL.createObjectURL(file);

      const trackObj = {
        id: trackId,
        ...meta,
        url: trackUrl,
        addedAt: Date.now()
      };

      this.tracks.push(trackObj);
      importedTrackIds.push(trackId);

      await StorageService.saveTrack({
        id: trackId,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        picture: meta.picture,
        format: meta.format,
        addedAt: trackObj.addedAt,
        fileData: file
      });
    }

    // If imported via folder selection, auto-create a playlist for this folder
    if (detectedFolderName && importedTrackIds.length > 0) {
      let pl = this.playlists.find(p => p.name.toLowerCase() === detectedFolderName.toLowerCase());
      if (!pl) {
        pl = await this.createPlaylist(detectedFolderName);
      }
      if (pl) {
        for (let tid of importedTrackIds) {
          await StorageService.addTrackToPlaylist(pl.id, tid);
        }
        await this.loadPlaylistsFromDB();
      }
    }

    this.renderTracks();
    if (this.currentTrackIndex < 0 && this.tracks.length > 0) {
      this.playTrack(0);
    }
  }

  async loadTracksFromDB() {
    const stored = await StorageService.getAllTracks();
    this.tracks = (stored || []).map(t => {
      let trackUrl = t.url;
      if (t.fileData) {
        try {
          trackUrl = URL.createObjectURL(t.fileData);
        } catch (e) {
          console.error("Error creating Object URL for track:", e);
        }
      }
      return {
        ...t,
        url: trackUrl
      };
    });
    this.renderTracks();
    if (this.currentTrackIndex < 0 && this.tracks.length > 0) {
      this.playTrack(0);
    }
  }

  renderTracks() {
    const query = this.searchInput.value.toLowerCase().trim();
    const sortBy = this.sortSelect.value;

    let filtered = this.tracks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.artist.toLowerCase().includes(query) ||
      t.album.toLowerCase().includes(query)
    );

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
      if (sortBy === 'album') return a.album.localeCompare(b.album);
      return (b.addedAt || 0) - (a.addedAt || 0);
    });

    this.statTrackCount.textContent = `${this.tracks.length} bài hát local`;
    this.emptyState.classList.toggle('hidden', filtered.length > 0);

    this.trackList.innerHTML = '';
    filtered.forEach((track, displayIdx) => {
      const originalIdx = this.tracks.indexOf(track);
      const isPlaying = originalIdx === this.currentTrackIndex;
      const isFav = this.favorites.includes(track.id);

      const defaultCover = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23121824'/><text x='50' y='55' font-size='35' fill='%2300f0ff' text-anchor='middle'>🎵</text></svg>";
      const cover = track.coverUrl || defaultCover;

      const card = document.createElement('div');
      card.className = `track-card ${isPlaying ? 'playing' : ''}`;
      card.innerHTML = `
        <div class="track-cover-wrapper">
          <img class="track-cover" src="${cover}" alt="Cover">
          <div class="track-play-overlay">
            <i class="fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} fa-2x"></i>
          </div>
          <button class="btn-add-to-playlist" title="Thêm vào Playlist">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
        <div class="track-info">
          <div class="track-card-title">${this.escapeHtml(track.title)}</div>
          <div class="track-card-artist">${this.escapeHtml(track.artist)}</div>
          <div class="track-card-meta">
            <span class="badge">${track.format || 'AUDIO'}</span>
            <span>${isFav ? '❤️' : ''}</span>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-add-to-playlist')) {
          e.stopPropagation();
          this.openAddToPlaylistModal(track.id);
          return;
        }
        this.playTrack(originalIdx);
      });

      this.trackList.appendChild(card);
    });
  }

  playTrack(index) {
    if (index < 0 || index >= this.tracks.length) return;

    this.currentTrackIndex = index;
    const track = this.tracks[index];

    const defaultCover = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23121824'/><text x='50' y='55' font-size='35' fill='%2300f0ff' text-anchor='middle'>🎵</text></svg>";
    const cover = track.coverUrl || defaultCover;

    this.playerTitle.textContent = track.title;
    this.playerArtist.textContent = track.artist;
    this.playerCoverArt.src = cover;
    if (this.lyricsCoverArt) this.lyricsCoverArt.src = cover;
    if (this.lyricsTrackTitle) this.lyricsTrackTitle.textContent = track.title;
    if (this.lyricsTrackArtist) this.lyricsTrackArtist.textContent = track.artist;

    const isFav = this.favorites.includes(track.id);
    this.btnToggleFavorite.classList.toggle('active', isFav);

    // Parse built-in LRC lyrics if present
    if (track.lrc) {
      this.currentLyrics = LyricsParser.parseLRC(track.lrc);
      this.renderLyrics();
    } else {
      this.currentLyrics = [];
      this.renderLyrics();
    }

    this.audioEngine.playTrackUrl(track.url);
    this.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    this.vinylDisc.classList.add('playing');

    this.renderTracks();
    this.visualizer.start();
  }

  togglePlayPause() {
    if (this.currentTrackIndex < 0 && this.tracks.length > 0) {
      this.playTrack(0);
      return;
    }

    if (this.audioEngine.audioElement.paused) {
      this.audioEngine.play();
      this.btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
      this.vinylDisc.classList.add('playing');
    } else {
      this.audioEngine.pause();
      this.btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
      this.vinylDisc.classList.remove('playing');
    }
  }

  playNext() {
    if (this.tracks.length === 0) return;
    let nextIdx;
    if (this.isShuffle) {
      nextIdx = Math.floor(Math.random() * this.tracks.length);
    } else {
      nextIdx = (this.currentTrackIndex + 1) % this.tracks.length;
    }
    this.playTrack(nextIdx);
  }

  playPrevious() {
    if (this.tracks.length === 0) return;
    let prevIdx;
    if (this.isShuffle) {
      prevIdx = Math.floor(Math.random() * this.tracks.length);
    } else {
      prevIdx = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    }
    this.playTrack(prevIdx);
  }

  updateTimeAndProgress(current, duration) {
    this.currentTimeEl.textContent = this.formatTime(current);
    this.totalTimeEl.textContent = this.formatTime(duration);

    const pct = duration > 0 ? (current / duration) * 100 : 0;
    this.seekbarProgress.style.width = `${pct}%`;
    this.seekbarHandle.style.left = `${pct}%`;
  }

  renderLyrics() {
    if (!this.lyricsContent) return;
    if (!this.currentLyrics || this.currentLyrics.length === 0) {
      this.lyricsContent.innerHTML = `
        <div class="lyrics-placeholder">
          <i class="fa-solid fa-quote-left"></i>
          <p>Chưa có tệp lời bài hát (.lrc).</p>
        </div>
      `;
      return;
    }

    this.lyricsContent.innerHTML = '';
    this.currentLyrics.forEach((lyric, idx) => {
      const line = document.createElement('div');
      line.className = `lyric-line ${idx === this.activeLyricIndex ? 'active' : ''}`;
      line.textContent = lyric.text;
      line.addEventListener('click', () => {
        this.audioEngine.seek(lyric.time);
      });
      this.lyricsContent.appendChild(line);
    });
  }

  updateLyricsHighlight(currentTime) {
    if (!this.lyricsContent || !this.currentLyrics || this.currentLyrics.length === 0) return;

    const newIdx = LyricsParser.getActiveLineIndex(this.currentLyrics, currentTime);
    if (newIdx !== this.activeLyricIndex) {
      this.activeLyricIndex = newIdx;
      const lines = this.lyricsContent.querySelectorAll('.lyric-line');
      lines.forEach((l, idx) => {
        l.classList.toggle('active', idx === newIdx);
      });

      if (lines[newIdx]) {
        lines[newIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  updateVolumeIcon(vol) {
    if (vol === 0) {
      this.btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else if (vol < 0.5) {
      this.btnMute.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
      this.btnMute.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  /* --- Playlist Methods --- */
  async loadPlaylistsFromDB() {
    this.playlists = await StorageService.getAllPlaylists();
    this.renderPlaylists();
  }

  renderPlaylists() {
    if (!this.playlistGrid) return;
    this.playlistGrid.innerHTML = '';

    if (this.playlists.length === 0) {
      this.playlistGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
          <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-dim);"></i>
          <h3>Chưa có Playlist nào</h3>
          <p>Nhấp vào "+ Tạo Playlist Mới" hoặc chọn "Chọn Thư Mục" từ máy tính để tự động tạo danh sách!</p>
        </div>
      `;
      return;
    }

    this.playlists.forEach(pl => {
      const count = pl.trackIds ? pl.trackIds.length : 0;
      const firstTrack = this.tracks.find(t => pl.trackIds && pl.trackIds.includes(t.id));
      const cover = firstTrack && firstTrack.coverUrl ? firstTrack.coverUrl : "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23121824'/><text x='50' y='55' font-size='35' fill='%2300f0ff' text-anchor='middle'>🎵</text></svg>";

      const card = document.createElement('div');
      card.className = 'playlist-card';
      card.innerHTML = `
        <div class="playlist-cover-wrapper">
          <img class="playlist-cover" src="${cover}" alt="Cover">
        </div>
        <div class="playlist-card-info">
          <div class="playlist-card-title">${this.escapeHtml(pl.name)}</div>
          <div class="playlist-card-count">${count} bài hát</div>
        </div>
        <div class="playlist-actions-overlay">
          <button class="btn-icon-danger btn-delete-pl" title="Xóa Playlist"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-pl')) {
          e.stopPropagation();
          this.deletePlaylist(pl.id);
          return;
        }
        this.openPlaylistDetail(pl.id);
      });

      this.playlistGrid.appendChild(card);
    });
  }

  async createPlaylist(name) {
    if (!name || !name.trim()) return null;
    const plObj = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      trackIds: [],
      createdAt: Date.now()
    };
    await StorageService.savePlaylist(plObj);
    this.playlists.push(plObj);
    this.renderPlaylists();
    return plObj;
  }

  async deletePlaylist(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa danh sách phát này không?')) return;
    await StorageService.deletePlaylist(id);
    this.playlists = this.playlists.filter(p => p.id !== id);
    if (this.activePlaylistId === id) {
      this.closePlaylistDetail();
    }
    this.renderPlaylists();
  }

  openPlaylistDetail(playlistId) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return;

    this.activePlaylistId = playlistId;
    if (this.playlistListView) this.playlistListView.style.display = 'none';
    if (this.playlistDetailView) this.playlistDetailView.style.display = 'block';

    if (this.playlistDetailTitle) this.playlistDetailTitle.textContent = pl.name;
    const plTracks = this.tracks.filter(t => pl.trackIds && pl.trackIds.includes(t.id));
    if (this.playlistDetailSubtitle) this.playlistDetailSubtitle.textContent = `${plTracks.length} bài hát trong danh sách này`;

    this.renderPlaylistTracks(plTracks);
  }

  closePlaylistDetail() {
    this.activePlaylistId = null;
    if (this.playlistDetailView) this.playlistDetailView.style.display = 'none';
    if (this.playlistListView) this.playlistListView.style.display = 'block';
  }

  renderPlaylistTracks(plTracks) {
    if (!this.playlistTrackList) return;
    this.playlistTrackList.innerHTML = '';
    if (plTracks.length === 0) {
      this.playlistTrackList.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 40px 20px;">
          <i class="fa-solid fa-music" style="font-size: 3rem; color: var(--text-dim);"></i>
          <h3>Playlist này chưa có bài hát nào</h3>
          <p>Hãy vào Thư viện nhạc và bấm nút '+' trên thẻ bài hát để thêm bài hát vào đây!</p>
        </div>
      `;
      return;
    }

    plTracks.forEach((track) => {
      const originalIdx = this.tracks.indexOf(track);
      const isPlaying = originalIdx === this.currentTrackIndex;

      const defaultCover = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23121824'/><text x='50' y='55' font-size='35' fill='%2300f0ff' text-anchor='middle'>🎵</text></svg>";
      const cover = track.coverUrl || defaultCover;

      const card = document.createElement('div');
      card.className = `track-card ${isPlaying ? 'playing' : ''}`;
      card.innerHTML = `
        <div class="track-cover-wrapper">
          <img class="track-cover" src="${cover}" alt="Cover">
          <div class="track-play-overlay">
            <i class="fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} fa-2x"></i>
          </div>
        </div>
        <div class="track-info">
          <div class="track-card-title">${this.escapeHtml(track.title)}</div>
          <div class="track-card-artist">${this.escapeHtml(track.artist)}</div>
          <div class="track-card-meta">
            <span class="badge">${track.format || 'AUDIO'}</span>
            <button class="btn-remove-from-pl" title="Xóa khỏi Playlist" style="color:#ff4d4d; border:none; background:transparent; cursor:pointer;"><i class="fa-solid fa-circle-minus"></i></button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-from-pl')) {
          e.stopPropagation();
          this.removeTrackFromActivePlaylist(track.id);
          return;
        }
        this.playTrack(originalIdx);
      });

      this.playlistTrackList.appendChild(card);
    });
  }

  async removeTrackFromActivePlaylist(trackId) {
    if (!this.activePlaylistId) return;
    await StorageService.removeTrackFromPlaylist(this.activePlaylistId, trackId);
    const pl = this.playlists.find(p => p.id === this.activePlaylistId);
    if (pl) {
      pl.trackIds = pl.trackIds.filter(id => id !== trackId);
    }
    this.openPlaylistDetail(this.activePlaylistId);
    this.renderPlaylists();
  }

  playActivePlaylist() {
    if (!this.activePlaylistId) return;
    const pl = this.playlists.find(p => p.id === this.activePlaylistId);
    if (!pl || !pl.trackIds || pl.trackIds.length === 0) return;

    const firstTrackId = pl.trackIds[0];
    const idx = this.tracks.findIndex(t => t.id === firstTrackId);
    if (idx >= 0) {
      this.playTrack(idx);
    }
  }

  async handleDeleteActivePlaylist() {
    if (!this.activePlaylistId) return;
    await this.deletePlaylist(this.activePlaylistId);
  }

  openCreatePlaylistModal() {
    if (!this.modalCreatePlaylist) return;
    this.playlistNameInput.value = '';
    this.modalCreatePlaylist.classList.add('active');
    setTimeout(() => this.playlistNameInput.focus(), 100);
  }

  closeCreatePlaylistModal() {
    if (!this.modalCreatePlaylist) return;
    this.modalCreatePlaylist.classList.remove('active');
  }

  async handleConfirmCreatePlaylist() {
    const name = this.playlistNameInput.value;
    if (!name || !name.trim()) return;
    await this.createPlaylist(name);
    this.closeCreatePlaylistModal();
  }

  openAddToPlaylistModal(trackId) {
    this.targetTrackForPlaylist = trackId;
    if (!this.modalAddToPlaylist) return;
    this.modalAddToPlaylist.classList.add('active');
    this.renderAddToPlaylistList();
  }

  closeAddToPlaylistModal() {
    this.targetTrackForPlaylist = null;
    if (!this.modalAddToPlaylist) return;
    this.modalAddToPlaylist.classList.remove('active');
  }

  renderAddToPlaylistList() {
    if (!this.addToPlaylistList) return;
    this.addToPlaylistList.innerHTML = '';

    if (this.playlists.length === 0) {
      this.addToPlaylistList.innerHTML = `
        <p style="font-size:0.9rem; color:var(--text-muted); text-align:center; padding:12px;">Bạn chưa có Playlist nào. Hãy tạo Playlist trước!</p>
      `;
      return;
    }

    this.playlists.forEach(pl => {
      const isAlreadyIn = pl.trackIds && pl.trackIds.includes(this.targetTrackForPlaylist);
      const item = document.createElement('div');
      item.className = 'playlist-select-item';
      item.innerHTML = `
        <div>
          <div style="font-weight:600; color:#fff;">${this.escapeHtml(pl.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${pl.trackIds ? pl.trackIds.length : 0} bài hát</div>
        </div>
        <div>
          ${isAlreadyIn 
            ? '<span style="font-size:0.8rem; color:var(--accent-cyan);"><i class="fa-solid fa-check"></i> Đã thêm</span>' 
            : '<button class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Thêm</button>'}
        </div>
      `;

      item.addEventListener('click', () => {
        this.addTrackToSelectedPlaylist(pl.id);
      });

      this.addToPlaylistList.appendChild(item);
    });
  }

  async addTrackToSelectedPlaylist(playlistId) {
    if (!this.targetTrackForPlaylist) return;
    await StorageService.addTrackToPlaylist(playlistId, this.targetTrackForPlaylist);
    const pl = this.playlists.find(p => p.id === playlistId);
    if (pl && (!pl.trackIds.includes(this.targetTrackForPlaylist))) {
      pl.trackIds.push(this.targetTrackForPlaylist);
    }
    this.renderAddToPlaylistList();
    this.renderPlaylists();
  }

  initPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPwaPrompt = e;
      const btn = document.getElementById('btnPwaInstall');
      if (btn) {
        btn.classList.remove('hidden');
        btn.addEventListener('click', () => {
          this.deferredPwaPrompt.prompt();
          this.deferredPwaPrompt.userChoice.then(() => {
            btn.classList.add('hidden');
          });
        });
      }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(err => {
        console.log('ServiceWorker registration failed', err);
      });
    }
  }

  toggleViewMode(mode = null) {
    if (mode) {
      this.viewMode = mode;
    } else {
      this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    }
    localStorage.setItem('soundpulse_view_mode', this.viewMode);
    this.applyViewMode();
  }

  applyViewMode() {
    const isList = this.viewMode === 'list';
    if (this.trackList) {
      this.trackList.classList.toggle('list-mode', isList);
    }
    const favList = document.getElementById('favoritesList');
    if (favList) {
      favList.classList.toggle('list-mode', isList);
    }
    if (this.playlistTrackList) {
      this.playlistTrackList.classList.toggle('list-mode', isList);
    }

    if (this.btnToggleLayout) {
      this.btnToggleLayout.innerHTML = isList 
        ? '<i class="fa-solid fa-list"></i>' 
        : '<i class="fa-solid fa-table-cells"></i>';
      this.btnToggleLayout.title = isList ? 'Chuyển sang dạng Lưới (Grid View)' : 'Chuyển sang dạng Danh sách (List View)';
    }

    this.showToast(isList ? '📋 Chế độ danh sách (List View)' : '🔳 Chế độ lưới (Grid View)');
  }

  showToast(message) {
    const toast = document.getElementById('toastContainer');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }
}

// Instantiate SoundPulse Application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SoundPulseApp();
});
