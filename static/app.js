(function () {
  const form = document.getElementById("form");
  const promptInput = document.getElementById("prompt");
  const durationSelect = document.getElementById("duration");
  const modelSelect = document.getElementById("model");
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
  const currentTimeEl = document.getElementById("currentTime");
  const durationTimeEl = document.getElementById("durationTime");
  const volumeSlider = document.getElementById("volume");
  const volumeBtn = document.getElementById("volumeBtn");

  function hideAll() {
    loading.classList.add("hidden");
    result.classList.add("hidden");
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
  }

  function setLoading(active) {
    if (active) {
      hideAll();
      loading.classList.remove("hidden");
      submitBtn.disabled = true;
    } else {
      loading.classList.add("hidden");
      submitBtn.disabled = false;
    }
  }

  function showError(message) {
    hideAll();
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
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
      if (progressBar)
        progressBar.setAttribute("aria-valuenow", Math.round(pct));
    }
    currentTimeEl.textContent = formatTime(t);
  }

  function updateDuration() {
    if (!player || !durationTimeEl) return;
    durationTimeEl.textContent = formatTime(player.duration);
  }

  function updatePlayPauseIcon() {
    if (!playPauseBtn || !iconPlay || !iconPause) return;
    const isPaused = player.paused;
    if (isPaused) {
      iconPlay.classList.remove("hidden");
      iconPause.classList.add("hidden");
      playPauseBtn.setAttribute("aria-label", "Play");
    } else {
      iconPlay.classList.add("hidden");
      iconPause.classList.remove("hidden");
      playPauseBtn.setAttribute("aria-label", "Pause");
    }
  }

  function setupCustomPlayer() {
    if (!player || !playPauseBtn) return;

    player.addEventListener("timeupdate", updateProgress);
    player.addEventListener("durationchange", updateDuration);
    player.addEventListener("ended", updatePlayPauseIcon);
    player.addEventListener("loadedmetadata", updateDuration);

    playPauseBtn.addEventListener("click", function () {
      if (player.paused) {
        player.play().catch(function () {});
      } else {
        player.pause();
      }
      updatePlayPauseIcon();
    });

    if (progressBar && progressFill) {
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
      });
    }
    if (volumeBtn) {
      var savedVolume = 1;
      volumeBtn.addEventListener("click", function () {
        if (player.volume > 0) {
          savedVolume = player.volume;
          player.volume = 0;
          if (volumeSlider) volumeSlider.value = 0;
          volumeBtn.setAttribute("aria-label", "Unmute");
        } else {
          player.volume = savedVolume;
          if (volumeSlider) volumeSlider.value = savedVolume * 100;
          volumeBtn.setAttribute("aria-label", "Mute");
        }
      });
    }

    updatePlayPauseIcon();
    updateProgress();
    updateDuration();
  }

  function showResult(streamUrl, downloadUrl) {
    loading.classList.add("hidden");
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
    player.src = streamUrl;
    player.load();
    downloadLink.href = downloadUrl;
    downloadLink.download = "auralis-generated.mp3";
    result.classList.remove("hidden");
    submitBtn.disabled = false;

    progressFill.style.width = "0%";
    if (progressBar) progressBar.setAttribute("aria-valuenow", 0);
    currentTimeEl.textContent = "0:00";
    durationTimeEl.textContent = "0:00";
    player.volume = 1;
    if (volumeSlider) volumeSlider.value = 100;
    if (volumeBtn) volumeBtn.setAttribute("aria-label", "Mute");

    setupCustomPlayer();
    player.play().catch(function () {});
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const prompt = (promptInput.value || "").trim();
    if (!prompt) {
      showError("Please describe the music you want.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt,
          duration: parseInt(durationSelect.value, 10),
          model_version: modelSelect.value,
        }),
      });
      const data = await res.json().catch(function () {
        return { error: "Invalid response from server." };
      });

      if (!res.ok) {
        showError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (data.error) {
        showError(data.error);
        return;
      }

      const streamUrl = data.stream_url || data.audio_url;
      const downloadUrl = data.download_url || data.audio_url;
      if (streamUrl) {
        showResult(streamUrl, downloadUrl);
      } else {
        showError("No audio URL in response.");
      }
    } catch (err) {
      showError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  });
})();
