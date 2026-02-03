# Auralis 🎵 — AI Instrumental Music Generator

**Auralis** is a web application that generates instrumental music from simple text descriptions using artificial intelligence. Inspired by apps like Suno, I built this to explore how AI can transform creative ideas into real music in seconds.

## 🌐 Live Demo

**[Try Auralis Live →](https://auralis-lv6e.onrender.com/)**

> **Note:** Auralis is deployed on Render's free tier. If you're visiting for the first time or after a period of inactivity, the server may take 30-60 seconds to spin up. Thanks for your patience!

## 🎯 What This Project Does

Auralis takes a text prompt like _"peaceful piano melody for studying"_ or _"upbeat guitar instrumental"_ and generates an original piece of instrumental music. The app uses Meta's MusicGen AI model via the Replicate API to compose and produce audio files based purely on your description.

## ✨ Key Features

- **Text-to-Music Generation**: Describe the mood, instruments, or style you want
- **Instant Playback**: Generated tracks play automatically in your browser
- **Waveform Visualization**: Animated waveform that responds to audio playback
- **Customizable Duration**: Choose between 8, 15, or 30-second compositions
- **Model Selection**: Pick between Melody (balanced) or Large (more complex) versions
- **Download**: Save your generated music as MP3 files
- **Elegant UI**: Clean light theme with musical illustrations and floating notes

## 🛠️ Technical Stack

### Frontend

- **HTML5** for structure
- **CSS3** for styling with modern light theme and animations
- **Vanilla JavaScript** for interactive controls, waveform visualization, and API communication

### Backend

- **Python Flask** server to handle API requests
- **Replicate API** integration for MusicGen model
- **python-dotenv** for secure API key management

### AI Model

- **Meta MusicGen** — state-of-the-art text-to-music generation model
- Supports multiple durations and model variants
- Outputs high-quality MP3 audio files

## 🎨 Design Philosophy

I designed Auralis with a clean, minimalist light aesthetic to create an elegant, focused experience. The UI features:

- Hand-drawn style illustrations of musicians (piano and tabla players)
- Subtle floating musical note animations in the background
- Musical staff loading animation with treble clef and bouncing notes
- Waveform visualization in the audio player
- Clean, centered layout that puts the creative process front and center

## 🚀 Setup and Run Locally

### Prerequisites

- Python 3.10 or 3.11
- A [Replicate](https://replicate.com) account (free tier available)
- Replicate API token

### Installation Steps

1. **Clone or download the project**

```bash
git clone https://github.com/your-username/auralis.git
cd auralis
```

2. **Create a virtual environment**

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Configure your API token**

   Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Replicate API token:

```
REPLICATE_API_TOKEN=r8_your_actual_token_here
```

Get your token from [Replicate Account → API tokens](https://replicate.com/account/api-tokens)

5. **Run the application**

```bash
python app.py
```

6. **Open in browser**

   Navigate to [http://127.0.0.1:5001](http://127.0.0.1:5001)

## 🌍 Deploying to Production

Auralis can be deployed to any Python-compatible hosting platform. The app is production-ready with gunicorn support. Currently deployed on [Render](https://render.com).

## 📖 How to Use Auralis

1. **Enter your prompt**: Describe the music you want to hear

   - Example: _"calm acoustic guitar, rainy day"_
   - Example: _"energetic electronic beat with synth"_

2. **Choose settings** (optional):

   - **Duration**: 8, 15, or 30 seconds
   - **Model**: Melody (default) or Large (more complex)

3. **Generate**: Click the Generate button

4. **Wait**: Generation takes 20-60 seconds depending on duration

5. **Listen & Download**: Play your track in-browser or download as MP3

## 📁 Project Structure

```
auralis/
├── app.py                 # Flask backend and Replicate API integration
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── Procfile              # Production server configuration
├── README.md             # This file
├── templates/
│   └── index.html        # Main application page
└── static/
    ├── style.css         # Styling and animations
    ├── app.js            # Frontend JavaScript logic
    └── images/
        ├── piano-illustration.png
        └── tabla-illustration.png
```

## 🎓 What I Learned

Building Auralis taught me:

- How to integrate AI models through APIs
- Flask backend development and API design
- Asynchronous JavaScript for smooth UX
- Deploying Python web applications
- Balancing aesthetic design with functionality

## 🔮 Future Enhancements

Ideas for future versions:

- Longer composition options (60+ seconds)
- Style presets (Jazz, Classical, Electronic, etc.)
- Multi-track generation and mixing
- User accounts to save generated tracks
- Sharing capabilities with unique URLs

## 🙏 Acknowledgments

- **Meta AI** for the MusicGen model
- **Replicate** for providing accessible AI model hosting
- Design inspiration from minimalist music apps

## 📄 License

This project is open source.

---

**Made with ♪ by Prateek**

_Transform your words into melodies_
