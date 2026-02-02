"""
Flask backend for AI instrumental music generation via Replicate (MusicGen).
"""
import os
import traceback
import urllib.parse
from io import BytesIO

import requests
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request, jsonify, send_file

app = Flask(__name__)

REPLICATE_API_TOKEN = os.environ.get("REPLICATE_API_TOKEN", "")


@app.errorhandler(405)
def handle_405(e):
    """Return JSON for 405 Method Not Allowed (e.g. GET to /api/generate)."""
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

        # Return Replicate URL for playback; proxy endpoints for same-origin/cache and download
        return jsonify({
            "audio_url": audio_url,
            "stream_url": f"/api/stream?url={urllib.parse.quote(audio_url, safe='')}",
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


def _fetch_audio(url):
    """Fetch audio file from URL using requests library for better SSL handling."""
    response = requests.get(
        url,
        headers={"User-Agent": "Auralis/1.0"},
        timeout=60,
        stream=True,
        verify=True,
    )
    response.raise_for_status()
    return response.content


@app.route("/api/stream")
def stream():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "Missing url parameter"}), 400
    url = urllib.parse.unquote(url)
    try:
        data = _fetch_audio(url)
        return send_file(BytesIO(data), mimetype="audio/mpeg", as_attachment=False)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch audio: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 502


@app.route("/api/download")
def download():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "Missing url parameter"}), 400
    url = urllib.parse.unquote(url)
    try:
        data = _fetch_audio(url)
        return send_file(
            BytesIO(data),
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name="auralis-generated.mp3",
        )
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch audio: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=True, host="0.0.0.0", port=port)
