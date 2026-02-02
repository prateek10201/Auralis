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

  function showResult(streamUrl, downloadUrl) {
    // Hide loading and error, but keep result visible
    loading.classList.add("hidden");
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
    // Set the audio source
    player.src = streamUrl;
    // Ensure the audio element loads the new source
    player.load();
    // Set download link
    downloadLink.href = downloadUrl;
    downloadLink.download = "auralis-generated.mp3";
    // Show the result section
    result.classList.remove("hidden");
    // Re-enable submit button
    submitBtn.disabled = false;
    // Try to play automatically (user interaction may be required)
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
