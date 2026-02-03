"""
Flask backend for AI instrumental music generation via Replicate (MusicGen).
Uses async prediction + polling so no single request blocks longer than a few seconds.
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

# MusicGen model version
MODEL_VERSION = "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb"


@app.errorhandler(405)
def handle_405(e):
    return jsonify({
        "error": "Method not allowed. Use POST to /api/generate.",
    }), 405


@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.exception("Unhandled error")
    return jsonify({"error": str(e) or "An unexpected error occurred."}), 500


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return "", 204


# ---------- STEP 1: Start prediction (returns ID immediately) ----------
@app.route("/api/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json(force=True, silent=True) or {}

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
            return jsonify({
                "error": "Replicate API token not set. Set REPLICATE_API_TOKEN in your environment or .env file.",
            }), 503

        # Create prediction via Replicate HTTP API (does NOT wait for result)
        response = requests.post(
            "https://api.replicate.com/v1/predictions",
            headers={
                "Authorization": f"Token {REPLICATE_API_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "version": MODEL_VERSION,
                "input": {
                    "prompt": prompt,
                    "duration": duration,
                    "model_version": model_version,
                    "output_format": "mp3",
                    "normalization_strategy": "loudness",
                },
            },
            timeout=10,  # Just creating the prediction, should be fast
        )

        if response.status_code != 201:
            error_text = response.text
            if "insufficient" in error_text.lower() or response.status_code == 402:
                return jsonify({
                    "error": "Your Replicate account is out of credit. Add credit at https://replicate.com/account/billing.",
                }), 402
            return jsonify({"error": f"Replicate error: {error_text}"}), 502

        prediction = response.json()
        prediction_id = prediction.get("id")

        if not prediction_id:
            return jsonify({"error": "No prediction ID returned from Replicate."}), 502

        # Return the prediction ID immediately — frontend will poll /api/status
        return jsonify({
            "prediction_id": prediction_id,
            "status": prediction.get("status", "starting"),
        })

    except Exception as e:
        app.logger.warning("generate error: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": str(e)}), 502


# ---------- STEP 2: Poll prediction status (called by frontend every 3s) ----------
@app.route("/api/status/<prediction_id>")
def status(prediction_id):
    try:
        if not REPLICATE_API_TOKEN:
            return jsonify({"error": "API token not set."}), 503

        response = requests.get(
            f"https://api.replicate.com/v1/predictions/{prediction_id}",
            headers={
                "Authorization": f"Token {REPLICATE_API_TOKEN}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )

        if response.status_code != 200:
            return jsonify({"error": f"Replicate error: {response.text}"}), 502

        prediction = response.json()
        pred_status = prediction.get("status", "unknown")

        # Still processing
        if pred_status in ("starting", "processing"):
            return jsonify({
                "status": pred_status,
                "prediction_id": prediction_id,
            })

        # Failed
        if pred_status == "failed":
            error_msg = prediction.get("error", "Music generation failed.")
            return jsonify({"status": "failed", "error": error_msg}), 422

        # Canceled
        if pred_status == "canceled":
            return jsonify({"status": "canceled", "error": "Generation was canceled."}), 422

        # Succeeded — extract audio URL
        if pred_status == "succeeded":
            output = prediction.get("output")
            audio_url = None

            if isinstance(output, str):
                audio_url = output
            elif isinstance(output, list) and output:
                audio_url = output[0]

            if not audio_url:
                return jsonify({"status": "failed", "error": "No audio URL in output."}), 422

            return jsonify({
                "status": "succeeded",
                "audio_url": audio_url,
                "stream_url": audio_url,  # Direct URL — browser plays without hitting Render
                "download_url": f"/api/download?url={urllib.parse.quote(audio_url, safe='')}",
            })

        # Unknown status
        return jsonify({"status": pred_status, "prediction_id": prediction_id})

    except Exception as e:
        app.logger.warning("status error: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": str(e)}), 502


# ---------- Download proxy (chunked streaming) ----------
def _stream_audio(url):
    """Stream audio in chunks to avoid timeout and memory issues."""
    response = requests.get(
        url,
        headers={"User-Agent": "Auralis/1.0"},
        timeout=120,
        stream=True,
        verify=True,
    )
    response.raise_for_status()
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