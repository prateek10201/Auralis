(function () {
  // DOM Elements
  const form = document.getElementById("form");
  const promptInput = document.getElementById("prompt");
  const durationInput = document.getElementById("duration");
  const modelInput = document.getElementById("model");
  const submitBtn = document.getElementById("submit");
  const loading = document.getElementById("loading");
  const result = document.getElementById("result");
  const errorEl = document.getElementById("error");
  const player = document.getElementById("player");
  const downloadLink = document.getElementById("download");
  const playPauseBtn = document.getElementById("playPause");
  const iconPlay = playPauseBtn && playPauseBtn.querySelector(".icon-play");
  const iconPause = playPauseBtn && playPauseBtn.querySelector(".icon-pause");
  const progressBar = document.getElementById("progressBar");
  const progressFill = document.getElementById("progressFill");
  const progressThumb = document.getElementById("progressThumb");
  const currentTimeEl = document.getElementById("currentTime");
  const durationTimeEl = document.getElementById("durationTime");
  const volumeSlider = document.getElementById("volume");
  const volumeBtn = document.getElementById("volumeBtn");
  const iconVolume = volumeBtn && volumeBtn.querySelector(".icon-volume");
  const iconMuted = volumeBtn && volumeBtn.querySelector(".icon-muted");
  const loadingText = document.querySelector(".loading-text");
  const waveformEl = document.getElementById("waveform");
  const floatingNotesContainer = document.querySelector(".floating-notes");

  let listenersAttached = false;
  let pollingInterval = null;
  let waveformBars = [];
  let animationFrameId = null;

  // Initialize floating notes background
  function initFloatingNotes() {
    if (!floatingNotesContainer) return;

    const notes = ["♪", "♫", "♬", "♩"];
    const positions = [
      { left: 8, top: 12 },
      { left: 85, top: 8 },
      { left: 15, top: 45 },
      { left: 90, top: 35 },
      { left: 5, top: 75 },
      { left: 92, top: 70 },
      { left: 20, top: 85 },
      { left: 80, top: 88 },
    ];

    positions.forEach((pos, i) => {
      const note = document.createElement("span");
      note.className = "floating-note";
      note.textContent = notes[i % notes.length];
      note.style.left = pos.left + "%";
      note.style.top = pos.top + "%";
      note.style.setProperty("--delay", i * 0.5 + "s");
      note.style.setProperty("--duration", 5 + Math.random() * 3 + "s");
      floatingNotesContainer.appendChild(note);
    });
  }

  // Initialize waveform visualization
  function initWaveform() {
    if (!waveformEl) return;

    waveformEl.innerHTML = "";
    waveformBars = [];

    const barCount = 50;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement("div");
      bar.className = "waveform-bar";
      // Create a wave pattern for initial state
      const height = 20 + Math.sin(i * 0.3) * 15 + Math.random() * 10;
      bar.style.height = height + "%";
      waveformEl.appendChild(bar);
      waveformBars.push(bar);
    }
  }

  // Animate waveform based on playback
  function animateWaveform() {
    if (!player || player.paused) {
      cancelAnimationFrame(animationFrameId);
      return;
    }

    const progress = player.currentTime / player.duration;
    const activeIndex = Math.floor(progress * waveformBars.length);

    waveformBars.forEach((bar, i) => {
      const baseHeight = 20 + Math.sin(i * 0.3 + player.currentTime * 2) * 25;
      const randomness = Math.random() * 15;
      bar.style.height = baseHeight + randomness + "%";

      if (i <= activeIndex) {
        bar.classList.add("active");
      } else {
        bar.classList.remove("active");
      }
    });

    animationFrameId = requestAnimationFrame(animateWaveform);
  }

  // Reset waveform to static state
  function resetWaveform() {
    cancelAnimationFrame(animationFrameId);
    waveformBars.forEach((bar, i) => {
      bar.classList.remove("active");
      const height = 20 + Math.sin(i * 0.3) * 15 + Math.random() * 10;
      bar.style.height = height + "%";
    });
  }

  function hideAll() {
    loading.classList.add("hidden");
    result.classList.add("hidden");
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
  }

  function setLoading(active, message) {
    if (active) {
      hideAll();
      loading.classList.remove("hidden");
      submitBtn.disabled = true;
      if (loadingText && message) {
        loadingText.textContent = message;
      }
    } else {
      loading.classList.add("hidden");
      submitBtn.disabled = false;
    }
  }

  function showError(message) {
    stopPolling();
    hideAll();
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updateProgress() {
    if (!player || !progressFill || !currentTimeEl) return;
    const t = player.currentTime;
    const d = player.duration;
    if (d > 0) {
      const pct = (t / d) * 100;
      progressFill.style.width = pct + "%";
      if (progressThumb) {
        progressThumb.style.left = pct + "%";
      }
      if (progressBar) {
        progressBar.setAttribute("aria-valuenow", Math.round(pct));
      }
    }
    currentTimeEl.textContent = formatTime(t);
  }

  function updateDuration() {
    if (!player || !durationTimeEl) return;
    durationTimeEl.textContent = formatTime(player.duration);
  }

  function updatePlayPauseIcon() {
    if (!playPauseBtn || !iconPlay || !iconPause) return;
    if (player.paused) {
      iconPlay.classList.remove("hidden");
      iconPause.classList.add("hidden");
      playPauseBtn.setAttribute("aria-label", "Play");
      resetWaveform();
    } else {
      iconPlay.classList.add("hidden");
      iconPause.classList.remove("hidden");
      playPauseBtn.setAttribute("aria-label", "Pause");
      animateWaveform();
    }
  }

  function updateVolumeIcon() {
    if (!volumeBtn || !iconVolume || !iconMuted) return;
    if (player.volume === 0 || player.muted) {
      iconVolume.classList.add("hidden");
      iconMuted.classList.remove("hidden");
      volumeBtn.setAttribute("aria-label", "Unmute");
    } else {
      iconVolume.classList.remove("hidden");
      iconMuted.classList.add("hidden");
      volumeBtn.setAttribute("aria-label", "Mute");
    }
  }

  function setupCustomPlayer() {
    if (!player || !playPauseBtn) return;

    if (!listenersAttached) {
      player.addEventListener("timeupdate", updateProgress);
      player.addEventListener("durationchange", updateDuration);
      player.addEventListener("ended", function () {
        updatePlayPauseIcon();
        resetWaveform();
      });
      player.addEventListener("loadedmetadata", updateDuration);
      player.addEventListener("play", animateWaveform);
      player.addEventListener("pause", function () {
        cancelAnimationFrame(animationFrameId);
      });

      playPauseBtn.addEventListener("click", function () {
        if (player.paused) {
          player.play().catch(function () {});
        } else {
          player.pause();
        }
        updatePlayPauseIcon();
      });

      if (progressBar) {
        progressBar.addEventListener("click", function (e) {
          const d = player.duration;
          if (!isFinite(d) || d <= 0) return;
          const rect = progressBar.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const pct = Math.max(0, Math.min(1, x / rect.width));
          player.currentTime = pct * d;
          updateProgress();
        });
      }

      if (volumeSlider) {
        volumeSlider.addEventListener("input", function () {
          player.volume = volumeSlider.value / 100;
          player.muted = false;
          updateVolumeIcon();
        });
      }

      if (volumeBtn) {
        var savedVolume = 1;
        volumeBtn.addEventListener("click", function () {
          if (player.volume > 0 && !player.muted) {
            savedVolume = player.volume;
            player.muted = true;
            if (volumeSlider) volumeSlider.value = 0;
          } else {
            player.muted = false;
            player.volume = savedVolume || 0.8;
            if (volumeSlider) volumeSlider.value = (savedVolume || 0.8) * 100;
          }
          updateVolumeIcon();
        });
      }

      listenersAttached = true;
    }

    updatePlayPauseIcon();
    updateProgress();
    updateDuration();
    updateVolumeIcon();
  }

  function showResult(streamUrl, downloadUrl) {
    stopPolling();
    loading.classList.add("hidden");
    errorEl.classList.add("hidden");
    errorEl.textContent = "";

    player.src = streamUrl;
    player.load();

    downloadLink.href = downloadUrl;
    downloadLink.download = "auralis-generated.mp3";

    result.classList.remove("hidden");
    submitBtn.disabled = false;

    // Reset player UI
    progressFill.style.width = "0%";
    if (progressThumb) progressThumb.style.left = "0%";
    if (progressBar) progressBar.setAttribute("aria-valuenow", 0);
    currentTimeEl.textContent = "0:00";
    durationTimeEl.textContent = "0:00";
    player.volume = 1;
    player.muted = false;
    if (volumeSlider) volumeSlider.value = 100;

    // Initialize waveform for new track
    initWaveform();
    setupCustomPlayer();

    player.oncanplay = function () {
      player.play().catch(function () {});
      updatePlayPauseIcon();
    };

    player.onerror = function () {
      showError("Failed to load audio. Please try generating again.");
    };
  }

  // ---------- STEP 2: Poll /api/status until prediction is done ----------
  function startPolling(predictionId) {
    setLoading(true, "Composing your melody");

    pollingInterval = setInterval(async function () {
      try {
        const res = await fetch("/api/status/" + predictionId);
        const data = await res.json().catch(function () {
          return { error: "Invalid status response." };
        });

        // Still running
        if (data.status === "starting") {
          setLoading(true, "Starting up");
          return;
        }
        if (data.status === "processing") {
          setLoading(true, "Crafting your masterpiece");
          return;
        }

        // Done — success
        if (data.status === "succeeded") {
          stopPolling();
          const streamUrl = data.stream_url || data.audio_url;
          const downloadUrl = data.download_url || data.audio_url;
          showResult(streamUrl, downloadUrl);
          return;
        }

        // Failed or canceled
        if (data.status === "failed" || data.status === "canceled") {
          stopPolling();
          showError(data.error || "Music generation failed. Please try again.");
          return;
        }

        // Any other error from the server
        if (data.error) {
          stopPolling();
          showError(data.error);
          return;
        }
      } catch (err) {
        stopPolling();
        showError("Network error while checking status. Please try again.");
      }
    }, 3000); // Poll every 3 seconds
  }

  // Handle Enter key to submit
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    }
  }

  // ---------- STEP 1: Submit prompt, get prediction ID ----------
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    stopPolling(); // Stop any previous polling

    const prompt = (promptInput.value || "").trim();
    if (!prompt) {
      showError("Please describe the music you want.");
      return;
    }

    setLoading(true, "Starting generation");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          duration: parseInt(durationInput.value, 10) || 30,
          model_version: modelInput.value || "melody",
        }),
      });

      const data = await res.json().catch(function () {
        return { error: "Invalid response from server." };
      });

      if (!res.ok || data.error) {
        showError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Got prediction ID — start polling for result
      if (data.prediction_id) {
        startPolling(data.prediction_id);
      } else {
        showError("No prediction ID received. Please try again.");
      }
    } catch (err) {
      showError(err.message || "Network error. Please try again.");
    }
  });

  // Add Enter key handler to textarea
  if (promptInput) {
    promptInput.addEventListener("keydown", handleKeyDown);
  }

  // Initialize
  initFloatingNotes();
})();
