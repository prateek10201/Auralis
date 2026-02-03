"""
Flask backend for AI instrumental music generation via Replicate (MusicGen).
"""
import os
import traceback
import urllib.parse

import requests
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request, jsonify, Response, stream_with_context

app = Flask(__name__)

REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")


@app.errorhandler(405)
def handle_405(e):
    """Return JSON for 405 Method Not Allowed."""
    return jsonify({
        "error": "Method not allowed. Use POST to /api/generate with a JSON body (prompt, duration, model_version).",
    }), 405


@app.errorhandler(Exception)
def handle_exception(e):
    """Catch any unhandled exception and return JSON so the frontend can show it."""
    app.logger.exception("Unhandled error")
    return jsonify({"error": str(e) or "An unexpected error occurred."}), 500


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/favicon.ico")
def favicon():
    return "", 204


@app.route("/api/generate", methods=["POST"])
def generate():
    try:
        try:
            data = request.get_json(force=True, silent=True) or {}
        except Exception:
            data = {}

        prompt = (data.get("prompt") or "").strip()

        try:
            duration = max(8, min(30, int(data.get("duration", 8))))
        except (TypeError, ValueError):
            duration = 8

        model_version = data.get("model_version", "melody")
        if model_version == "melody":
            model_version = "melody-large"
        elif model_version != "large":
            model_version = "melody-large"

        if not prompt:
            return jsonify({"error": "Please provide a text prompt."}), 400

        if not REPLICATE_API_TOKEN:
            return (
                jsonify({
                    "error": "Replicate API token not set. Set REPLICATE_API_TOKEN in your environment or .env file.",
                }),
                503,
            )

        import replicate

        output = replicate.run(
            "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
            input={
                "prompt": prompt,
                "duration": duration,
                "model_version": model_version,
                "output_format": "mp3",
                "normalization_strategy": "loudness",
            },
            use_file_output=False,
        )

        # Replicate can return: URL string, list of URLs, or FileOutput-like object with .url
        audio_url = None
        if output is None:
            pass
        elif hasattr(output, "url"):
            audio_url = getattr(output, "url", None)
        elif isinstance(output, list) and output:
            first = output[0]
            audio_url = getattr(first, "url", first) if first is not None else None
        elif isinstance(output, str):
            audio_url = output

        if not audio_url or not isinstance(audio_url, str):
            return jsonify({"error": "No audio URL returned from Replicate."}), 502

        # FIX: Return the direct Replicate URL for playback (no proxy needed)
        # Only use the proxy /api/download for downloading (chunked streaming)
        return jsonify({
            "audio_url": audio_url,
            "stream_url": audio_url,  # Direct URL — browser plays this without hitting Render again
            "download_url": f"/api/download?url={urllib.parse.quote(audio_url, safe='')}",
        })

    except Exception as e:
        err_msg = str(e)
        if "insufficient credit" in err_msg.lower() or "402" in err_msg:
            return (
                jsonify({
                    "error": "Your Replicate account is out of credit. Add credit at https://replicate.com/account/billing and try again in a few minutes.",
                }),
                402,
            )
        app.logger.warning("generate error: %s\n%s", err_msg, traceback.format_exc())
        return jsonify({"error": err_msg}), 502


def _stream_audio(url):
    """Properly stream audio in chunks to avoid timeout and memory issues."""
    response = requests.get(
        url,
        headers={"User-Agent": "Auralis/1.0"},
        timeout=120,
        stream=True,  # Now we actually USE streaming
        verify=True,
    )
    response.raise_for_status()
    # Yield in chunks — this keeps the connection alive and avoids loading entire file into memory
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:
            yield chunk


@app.route("/api/download")
def download():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "Missing url parameter"}), 400
    url = urllib.parse.unquote(url)
    try:
        # Use chunked streaming response — no timeout issues on Render
        return Response(
            stream_with_context(_stream_audio(url)),
            mimetype="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=auralis-generated.mp3",
            },
        )
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch audio: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host="0.0.0.0", port=port)