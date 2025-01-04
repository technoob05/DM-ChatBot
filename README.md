# DM ChatBot

An intelligent chatbot built with Flask and Google's Gemini AI, featuring voice interaction, file handling, and dark mode support.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-v3.6+-blue.svg)
![Flask](https://img.shields.io/badge/flask-v2.3.2-green.svg)

## Features

- 🤖 AI-powered responses using Google's Gemini AI
- 🗣️ Voice input and text-to-speech output
- 📁 File upload and processing support
- 🌓 Dark mode toggle
- 😊 Emoji picker
- 💬 Code syntax highlighting
- 📱 Responsive design
- 🌐 Multi-language support
- 📋 Copy-to-clipboard functionality

## Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML, CSS, JavaScript
- **AI Model:** Google Gemini AI
- **Libraries:** 
  - marked.js for Markdown rendering
  - Prism.js for syntax highlighting
  - Font Awesome for icons
  - Bootstrap for styling

## Prerequisites

- Python 3.6 or higher
- Node.js and npm
- Google Gemini API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dm-chatbot.git
cd dm-chatbot
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Install JavaScript dependencies:
```bash
npm install
```

4. Create a `.env` file in the root directory and add your Gemini API key:
```env
GEMINI_API_KEY=your_api_key_here
```

## Directory Structure

```
dm-chatbot/
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── package.json          # Node.js dependencies
├── static/
│   ├── css/
│   │   └── index.css     # Styles
│   └── js/
│       └── index.js      # Frontend JavaScript
└── templates/
    └── index.html        # Main HTML template
```

## Usage

1. Start the Flask server:
```bash
python app.py
```

2. Open your browser and navigate to `http://localhost:5001`

3. Start chatting with the bot! You can:
   - Type messages and press Enter or click the send button
   - Use voice input by clicking the microphone icon
   - Upload files for the bot to process
   - Toggle dark mode
   - Use emojis from the emoji picker

## Features in Detail

### Voice Interaction
- Click the microphone icon to start voice input
- Automatic speech-to-text conversion
- Text-to-speech output for bot responses
- Support for multiple languages

### File Handling
- Supports multiple file formats: .txt, .pdf, .png, .jpg, .jpeg, .csv, .xlsx, .docx
- Automatic file type detection and icon display
- File preview
- Maximum file size: 16MB

### UI Features
- Responsive design that works on both desktop and mobile
- Dark mode for comfortable nighttime usage
- Emoji picker with commonly used emojis
- Code syntax highlighting for multiple programming languages
- Copy-to-clipboard functionality for messages and code blocks

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI for providing the language model
- Flask team for the web framework
- All open-source libraries used in this project

## Contact

Your Name - your.email@example.com
Project Link: https://github.com/yourusername/dm-chatbot