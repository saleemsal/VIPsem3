# GT Study Buddy

A React application for Georgia Tech students featuring AI-powered study assistance with local Ollama integration. Built with React, TypeScript and Vite.

## Quick Start

Open a terminal in your interactive desktop session and follow these steps (when launching your interactive desktop instance please have an NVIDIA-GPU available):

### 1. Clone the Repository (development branch)

Navigate to (Note: if shared instance does not work clone this branch or the dev branch to your home folder)
```bash
/home/hice1/hhuynh45/vip-vp4/Fall2025/W-SB-TUT-Stud-2/chatGT/W-SB-TUT-Stud-2
```
If you run into permission issues with git, such as running git branch to verify you are on the development branch, please run 
```bash
git config --global --add safe.directory /storage/ice-shared/vip-vp4/Fall2025/W-SB-TUT-Stud-2
```
### 2. Install Required Ollama Models

Before running the application, install these three Ollama models:

```bash
ollama pull llama3.1:8b
ollama pull phi3:medium
ollama pull gemma2:9b
```

This will take several minutes. Verify installation with:
```bash
ollama list
```

### 3. Install Dependencies

Make the install script executable and run it (this handles all npm dependencies):

```bash
chmod +x install.sh
./install.sh
```

### 4. Run the Application

Make the startup script executable and launch the app:

```bash
chmod +x run.sh
./run.sh
```

Or run 


```bash
chmod +x startup.sh
./startup.sh
```

The `startup.sh` script handles everything: starting Ollama, launching the local API, and running the frontend.

Access the application at: **http://localhost:5173**

Note: You can also use `run.sh` which provides the same functionality as `startup.sh`.

## Features

**Chat Interface**: Streaming AI chat with local Ollama models for complete privacy.

**RAG with Citations**: Upload PDFs and text files, then ask questions. The AI will answer based only on your uploaded documents with page-specific citations.

**Smart PDF Processing**: Accurate text extraction from complex PDFs including textbooks and slides.

**Dual-Mode Chat**: 
- General study assistant mode without files
- Document-specific Q&A with citations when files are uploaded

**Practice Generator**: Create quizzes and practice problems from your study materials.

**Flashcards**: Build flashcard decks from your notes with CSV export for Anki.

**Study Planner**: Weekly study plans with assignment tracking.

**Canvas Integration**: To enable Canvas integration, generate an API key from your Canvas account "Settings" page, then paste it into the button in the top right corner of the application.

## Technical Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- Local Ollama for AI (llama3.1, phi3, gemma2)
- PDF.js for local PDF parsing
- Supabase for optional cloud storage
- GT-themed UI with navy blue and gold colors

## Privacy

Everything runs locally on your machine. Your documents and AI conversations never leave your computer. Ollama processes all queries locally without sending data to external servers.

## Contributions

Please feel free to contribute to this repo by making a pull request. We welcome features particularly to the Canvas integration to add more Canvas tools.
