# Auralis — AI Instrumental Music Generator

Generate instrumental music from text prompts using [Meta MusicGen](https://replicate.com/meta/musicgen) via the Replicate API.

## Features

- **Text prompt**: Describe the mood, instruments, or style (e.g. "peaceful piano melody for studying", "upbeat guitar instrumental").
- **Generate**: Sends the prompt to MusicGen on Replicate and returns an MP3.
- **Play**: Generated track plays automatically in the browser.
- **Download**: Save the file as `auralis-generated.mp3`.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript — simple form, loading state, HTML5 audio player.
- **Backend**: Python Flask — proxies requests to Replicate API and streams/downloads audio.
- **API**: [Replicate](https://replicate.com) — model `meta/musicgen`.

## Setup and Run Locally

### 1. Prerequisites

- Python 3.10 or 3.11
- A [Replicate](https://replicate.com) account and API token

### 2. Clone and enter the project

```bash
cd /path/to/Auralis_Project
```

### 3. Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Set your Replicate API token

Create a `.env` file in the project root (copy from the example):

```bash
cp .env.example .env
```

Edit `.env` and set your token:

```
REPLICATE_API_TOKEN=r8_your_actual_token_here
```

Get your token from [Replicate Account → API tokens](https://replicate.com/account/api-tokens).

### 6. Run the app

```bash
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

## Usage

1. Enter a short description of the music (e.g. "calm acoustic guitar, rainy day").
2. Optionally choose duration (8, 15, or 30 seconds) and model (Melody or Large).
3. Click **Generate**.
4. Wait up to about a minute; the track will play when ready.
5. Use **Download** to save the MP3.

## Project layout

```
Auralis_Project/
├── app.py              # Flask server and Replicate API integration
├── requirements.txt
├── .env.example        # Example env (copy to .env and add token)
├── README.md
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── app.js
```

## Notes

- Generation usually takes 30–60 seconds.
- Replicate charges per run; see [Replicate pricing](https://replicate.com/pricing).
- Keep your `.env` (and token) out of version control.
