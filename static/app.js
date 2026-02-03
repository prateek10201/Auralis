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
  const loadingText = document.querySelector(".loading-text");

  let listenersAttached = false;
  let pollingInterval = null; // Stores the polling timer so we can stop it

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
    if (player.paused) {
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

    if (!listenersAttached) {
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

      listenersAttached = true;
    }

    updatePlayPauseIcon();
    updateProgress();
    updateDuration();
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

    progressFill.style.width = "0%";
    if (progressBar) progressBar.setAttribute("aria-valuenow", 0);
    currentTimeEl.textContent = "0:00";
    durationTimeEl.textContent = "0:00";
    player.volume = 1;
    if (volumeSlider) volumeSlider.value = 100;
    if (volumeBtn) volumeBtn.setAttribute("aria-label", "Mute");

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
    setLoading(true, "Composing your music...");

    pollingInterval = setInterval(async function () {
      try {
        const res = await fetch("/api/status/" + predictionId);
        const data = await res.json().catch(function () {
          return { error: "Invalid status response." };
        });

        // Still running
        if (data.status === "starting") {
          setLoading(true, "Starting up...");
          return;
        }
        if (data.status === "processing") {
          setLoading(true, "Crafting your masterpiece...");
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

  // ---------- STEP 1: Submit prompt, get prediction ID ----------
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    stopPolling(); // Stop any previous polling

    const prompt = (promptInput.value || "").trim();
    if (!prompt) {
      showError("Please describe the music you want.");
      return;
    }

    setLoading(true, "Starting generation...");

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
})();
