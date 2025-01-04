
// Initialize speech recognition
let recognition = null;
let isEmojiPickerVisible = false;
let currentAudio = null;
let currentFile = null;

try {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;
} catch (e) {
    console.warn('Speech recognition not supported:', e);
}

// Get DOM elements
const darkModeToggle = document.getElementById('darkModeToggle');
const emojiToggle = document.getElementById('emoji-toggle');
const emojiPicker = document.getElementById('emoji-picker');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Core Message Handling Functions
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message && !currentFile) return;

    userInput.value = '';
    appendMessage('You', message);
    document.getElementById('loading').style.display = 'flex';

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                file_id: currentFile
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        appendMessage('Bot', data.response, new Date(), data.audio_url);
        
        // Clear file after sending
        if (currentFile) {
            removeFile();
        }
    } catch (error) {
        console.error('Error:', error);
        appendMessage('Bot', 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

async function appendMessage(sender, message, timestamp = new Date(), audioUrl = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'You' ? 'user-message' : 'bot-message');

    message = processMessageContent(message);

    messageDiv.innerHTML = `
        <div class="message-meta">
            <strong>${sender}</strong>
            <span>${timestamp.toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${message}</div>
    `;

    // Add audio controls for bot messages
    if (sender === 'Bot') {
        const audioControls = document.createElement('div');
        audioControls.classList.add('audio-controls');
        
        // TTS button
        const ttsButton = document.createElement('button');
        ttsButton.classList.add('btn', 'btn-icon');
        ttsButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        ttsButton.onclick = () => {
            if (audioUrl) {
                playAudioResponse(audioUrl, ttsButton);
            } else {
                speakText(message);
            }
        };
        
        // Stop button
        const stopButton = document.createElement('button');
        stopButton.classList.add('btn', 'btn-icon', 'hidden');
        stopButton.innerHTML = '<i class="fas fa-stop"></i>';
        stopButton.onclick = stopAudioPlayback;
        
        audioControls.appendChild(ttsButton);
        audioControls.appendChild(stopButton);
        messageDiv.appendChild(audioControls);
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    Prism.highlightAll();
}

// Message Content Processing
function processMessageContent(message) {
    message = escapeHtml(message);
    
    const codeBlocks = [];
    message = message.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push({
            language: lang || 'plaintext',
            code: code.trim()
        });
        return placeholder;
    });

    message = message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');

    // Add copy button for each code block
    codeBlocks.forEach((block, index) => {
        const placeholder = `__CODE_BLOCK_${index}__`;
        const codeHtml = `
            <div class="code-wrapper">
                <button class="copy-btn" onclick="copyText(\`${block.code.replace(/`/g, '\\`')}\`, this)">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <pre><code class="language-${block.language}">${block.code}</code></pre>
            </div>
        `;
        message = message.replace(placeholder, codeHtml);
    });

    // Add copy button for the entire message
    return `
        <div class="message-content-wrapper">
            ${message}
            <button class="copy-btn" onclick="copyText(\`${message.replace(/`/g, '\\`')}\`, this)">
                <i class="fas fa-copy"></i> Copy All
            </button>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Audio Handling Functions
async function playAudioResponse(audioUrl, button) {
    try {
        stopAudioPlayback();
        
        const icon = button.querySelector('i');
        icon.classList.remove('fa-volume-up');
        icon.classList.add('fa-spinner', 'fa-spin');
        
        currentAudio = new Audio(audioUrl);
        currentAudio.addEventListener('ended', () => {
            icon.classList.remove('fa-spinner', 'fa-spin');
            icon.classList.add('fa-volume-up');
            button.nextElementSibling.classList.add('hidden');
        });
        
        currentAudio.addEventListener('playing', () => {
            icon.classList.remove('fa-spinner', 'fa-spin');
            icon.classList.add('fa-volume-up');
            button.nextElementSibling.classList.remove('hidden');
        });
        
        currentAudio.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            icon.classList.remove('fa-spinner', 'fa-spin');
            icon.classList.add('fa-volume-up');
            button.nextElementSibling.classList.add('hidden');
            fallbackToSpeechSynthesis(message);
        });
        
        await currentAudio.play();
    } catch (error) {
        console.error('Error playing audio:', error);
        fallbackToSpeechSynthesis(message);
    }
}

function stopAudioPlayback() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    window.speechSynthesis.cancel();
}

function fallbackToSpeechSynthesis(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    
    const voices = speechSynthesis.getVoices();
    const vietnameseVoice = voices.find(voice => voice.lang === 'vi-VN');
    if (vietnameseVoice) {
        utterance.voice = vietnameseVoice;
    }
    
    const cleanText = text.replace(/<[^>]*>/g, '')
                         .replace(/\*\*(.*?)\*\*/g, '$1')
                         .replace(/\*(.*?)\*/g, '$1')
                         .replace(/`(.*?)`/g, '$1');
    
    utterance.text = cleanText;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    window.speechSynthesis.speak(utterance);
}

// Voice Input Functions
function startVoiceInput() {
    if (!recognition) {
        alert('Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.');
        return;
    }

    const micIcon = document.querySelector('.fa-microphone');
    micIcon.classList.add('recording');
    
    recognition.onstart = () => {
        micIcon.style.color = '#ff4444';
        const recordingIndicator = document.createElement('div');
        recordingIndicator.id = 'recording-indicator';
        recordingIndicator.textContent = 'Đang nghe...';
        document.querySelector('.input-container').appendChild(recordingIndicator);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        setTimeout(sendMessage, 500);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        micIcon.style.color = '';
        micIcon.classList.remove('recording');
        removeRecordingIndicator();
    };

    recognition.onend = () => {
        micIcon.style.color = '';
        micIcon.classList.remove('recording');
        removeRecordingIndicator();
    };

    try {
        recognition.start();
    } catch (error) {
        console.error('Error starting speech recognition:', error);
        micIcon.style.color = '';
        micIcon.classList.remove('recording');
        removeRecordingIndicator();
    }
}

function removeRecordingIndicator() {
    const indicator = document.getElementById('recording-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// File Upload Functions
document.getElementById('file-upload').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            currentFile = data.filename;
            showFilePreview(file.name);
        } else {
            alert(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file');
    }
});

function showFilePreview(filename) {
    const preview = document.createElement('div');
    preview.classList.add('file-preview');
    preview.innerHTML = `
        ${updateFilePreviewIcon(filename)}
        <span>${filename}</span>
        <button class="btn btn-icon" onclick="removeFile()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const existingPreview = document.querySelector('.file-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    document.querySelector('.input-container').insertBefore(
        preview,
        document.getElementById('user-input')
    );
}

function updateFilePreviewIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    let iconClass = 'fa-file';
    
    const iconMap = {
        'pdf': 'fa-file-pdf',
        'txt': 'fa-file-alt',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'png': 'fa-file-image',
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'gif': 'fa-file-image',
        'csv': 'fa-file-csv'
    };

    if (iconMap[extension]) {
        iconClass = iconMap[extension];
    }

    return `<i class="fas ${iconClass}"></i>`;
}

function removeFile() {
    currentFile = null;
    const preview = document.querySelector('.file-preview');
    if (preview) {
        preview.remove();
    }
    document.getElementById('file-upload').value = '';
}

// Copy Function
function copyText(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        button.classList.add('copy-success');
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        setTimeout(() => {
            button.classList.remove('copy-success');
            button.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text:', err);
        alert('Failed to copy text');
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Dark mode toggle
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const icon = darkModeToggle.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
    });

    // Focus input on load
    userInput.focus();

    // Add welcome message
    appendMessage('Bot', 'Xin chào! Tôi là trợ lý AI. Tôi có thể giúp gì cho bạn?');
});