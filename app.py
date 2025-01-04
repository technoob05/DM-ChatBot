from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import google.generativeai as genai
from langdetect import detect
from gtts import gTTS
import os
import tempfile
from werkzeug.utils import secure_filename
import logging
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configure upload settings
UPLOAD_FOLDER = Path(tempfile.gettempdir()) / 'ai_chat_files'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'csv', 'xlsx', 'docx'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

# Create upload folders
UPLOAD_FOLDER.mkdir(exist_ok=True)
AUDIO_FOLDER = UPLOAD_FOLDER / 'audio'
AUDIO_FOLDER.mkdir(exist_ok=True)
FILES_FOLDER = UPLOAD_FOLDER / 'files'
FILES_FOLDER.mkdir(exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Configure Gemini API
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")
genai.configure(api_key=api_key)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_files():
    """Clean up files older than 1 day"""
    try:
        current_time = datetime.now()
        for folder in [AUDIO_FOLDER, FILES_FOLDER]:
            for file in folder.glob('*.*'):
                file_time = datetime.fromtimestamp(file.stat().st_mtime)
                if (current_time - file_time) > timedelta(days=1):
                    file.unlink()
    except Exception as e:
        logger.error(f"Error cleaning up old files: {e}")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed"}), 400
        
        try:
            # Create unique filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            filename = secure_filename(f"{timestamp}_{file.filename}")
            filepath = FILES_FOLDER / filename
            file.save(str(filepath))
            
            # Clean up old files
            cleanup_old_files()
            
            return jsonify({
                "success": True,
                "filename": filename,
                "message": "File uploaded successfully"
            })
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            return jsonify({"error": "Error saving file"}), 500
            
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({"error": "Upload failed"}), 500

@app.route("/files/<filename>")
def get_file(filename):
    """Serve uploaded files"""
    try:
        return send_file(
            FILES_FOLDER / secure_filename(filename),
            as_attachment=True
        )
    except Exception as e:
        logger.error(f"Error serving file: {e}")
        return jsonify({"error": "File not found"}), 404

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.json
        user_message = data.get("message")
        file_id = data.get("file_id")  # Optional file reference
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        # Include file content in the prompt if file is provided
        if file_id:
            try:
                file_path = FILES_FOLDER / secure_filename(file_id)
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                user_message = f"File content:\n{file_content}\n\nUser message: {user_message}"
            except Exception as e:
                logger.error(f"Error reading file: {e}")

        # Detect language with error handling
        try:
            language = detect(user_message)
        except:
            language = 'vi'
            logger.warning("Language detection failed, defaulting to Vietnamese")

        # Generate AI response
        try:
            model = genai.GenerativeModel("gemini-pro")
            response = model.generate_content(user_message)
            bot_response = response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return jsonify({
                "error": "Có lỗi xảy ra khi gọi API Gemini. Vui lòng thử lại sau.",
                "language": language
            }), 500

        # Generate speech file
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            filename = secure_filename(f"response_{timestamp}.mp3")
            filepath = AUDIO_FOLDER / filename
            
            tts = gTTS(text=bot_response, lang=language)
            tts.save(str(filepath))

            cleanup_old_files()

            return jsonify({
                "response": bot_response,
                "language": language,
                "audio_url": f"/audio/{filename}"
            })

        except Exception as e:
            logger.error(f"Text-to-speech error: {e}")
            return jsonify({
                "response": bot_response,
                "language": language,
                "error": "Không thể tạo âm thanh"
            })

    except Exception as e:
        logger.error(f"General error in chat endpoint: {e}")
        return jsonify({
            "error": "Có lỗi xảy ra. Vui lòng thử lại sau."
        }), 500

@app.route("/audio/<filename>")
def serve_audio(filename):
    try:
        return send_file(
            AUDIO_FOLDER / secure_filename(filename),
            mimetype="audio/mpeg"
        )
    except Exception as e:
        logger.error(f"Error serving audio file: {e}")
        return jsonify({"error": "Audio file not found"}), 404

if __name__ == "__main__":
    # Ensure upload directories exist
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    AUDIO_FOLDER.mkdir(parents=True, exist_ok=True)
    FILES_FOLDER.mkdir(parents=True, exist_ok=True)
    
    # Start the application
    app.run(debug=True, port=5001)