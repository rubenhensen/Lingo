# Lingo - TV Show Format

A two-team competitive word guessing game based on the Dutch TV show Lingo.

**New Features:**
- 🎮 Two-team competitive gameplay
- 🎯 Bingo grids with Lingo detection
- 🎲 Bonus rounds with scrambled 10-letter words
- 🏆 Round-based structure with final scoring

Demo: https://lingo.koenvh.nl

## 🚀 Quick Start (Easy Testing)

**The fastest way to test the game:**

```bash
./quick-start.sh
```

This script will:
1. ✓ Set up config files automatically
2. ✓ Install PHP dependencies via Composer
3. ✓ Use test database (no MySQL setup needed!)
4. ✓ Start both API and web servers
5. ✓ Open in your browser at `http://localhost:8001`

**Requirements:**
- PHP 7.0+
- Composer

**That's it!** Words are loaded from CSV files in the `parsers/` directory - no database setup needed!

---

## 📋 Game Rules

### Scoring System
- **Word guessing**: 5pts (try 1), 4pts (try 2), 3pts (try 3), 2pts (try 4), 1pt (try 5)
- **Team 2's chance**: 1pt if they guess correctly on try 6
- **LINGO** (complete row/column/diagonal): +10pts → triggers bonus round
- **Bonus word correct**: +10pts
- **Bonus word wrong**: -5pts

### Game Flow
1. **Round 1**: Play 5-letter words until one team gets LINGO
2. Winning team plays bonus round (10-letter scrambled word)
3. **Round 2**: Play 6-letter words until one team gets LINGO
4. Winning team plays bonus round
5. **Final Score**: Winner announced!

### Number Entry
After a team guesses correctly, the game operator manually enters a number (1-25) that was physically pulled. This number is marked on the winning team's bingo grid.

### Bonus Round Mechanics
- Word displayed completely scrambled
- Auto-animation: Every 3 seconds, 2 letters shuffle:
  - 1 letter moves to **correct position** (turns green)
  - 1 letter moves to **wrong position** (stays scrambled)
- Press **SPACE** to pause and enter guess
- Wrong guess: -5 points, animation continues
- Correct guess: +10 points, show word, end bonus

---

## 🗂️ Project Structure

### Frontend (`website/`)
- **index.html**: Single-page application with menu and game UI
- **js/lingo.js**: Core game logic and team management
- **js/bingo.js**: Bingo grid system and Lingo detection
- **js/bonus.js**: Bonus round logic and animations
- **js/index.js**: Menu handling and game initialization

### Backend (`api/`)
- **Slim Framework 3** REST API with endpoints:
  - `POST /init-team-game`: Initialize a new team game
  - `POST /check`: Validate guess and return letter states
  - `POST /next-word`: Get next word for the round
  - `POST /submit-number`: Submit bingo number after correct guess
  - `POST /init-bonus`: Initialize bonus round with 10-letter word
  - `POST /right`: Return the correct word when game ends

- **Controllers/LingoController.php**: Game logic including:
  - Team switching and scoring
  - Bingo grid generation and Lingo detection
  - Dutch "IJ" digraph handling (represented as "|" internally)
  - Letter-by-letter comparison for guess validation

### Word Data
Words are loaded from CSV files in `parsers/` directory. Each CSV entry contains:
- `word`: The word (uppercase)
- `language`: Language code (nl, en, de)
- `characters`: Word length (IJ counts as 1 character in Dutch)
- `sane`: Boolean flag (1 for curated words, 0 for all valid words)

The Database class loads all CSV files into memory on startup for fast lookups.

---

## 🛠️ Manual Setup

### 1. Install Dependencies
```bash
cd api
composer install
```

### 2. Configure
```bash
# Copy config files
cp api/config.example.php api/config.php
cp website/js/config.example.js website/js/config.js

# Update website/js/config.js with your API URL if needed
```

### 3. Generate Word Data (if needed)
```bash
# The repo includes CSV files, but you can regenerate them:
cd parsers/Dutch
php parse.php

# Repeat for English and German if needed
```

### 4. Run Servers
```bash
# Terminal 1 - API Server
cd api
php -S localhost:8000 -t .

# Terminal 2 - Web Server
cd website
php -S localhost:8001 -t .
```

### 5. Open Browser
Navigate to: `http://localhost:8001`

---

## 🎯 Testing Checklist

- [ ] Two teams can alternate turns
- [ ] Scoring works (5,4,3,2,1 points based on try count)
- [ ] Team 2 gets 6th try after Team 1 exhausts 5 tries
- [ ] Bingo grids generate with unique numbers 1-25
- [ ] Number entry modal appears after correct guess
- [ ] Lingo detection works for all 12 lines (5 rows, 5 cols, 2 diagonals)
- [ ] Lingo awards 10 points and triggers bonus round
- [ ] Bonus round displays scrambled 10-letter word
- [ ] Auto-reveal animation works (1 correct green, 1 wrong)
- [ ] Space bar pauses animation
- [ ] Correct bonus guess: +10 points, wrong: -5 points
- [ ] Round 1 uses 5-letter words
- [ ] Round 2 uses 6-letter words
- [ ] Final score screen shows winner

---

## 📝 Development Notes

### Dutch "IJ" Digraph Handling
The Dutch language treats "IJ" as a single character. The codebase handles this by:
1. Converting "IJ" → "|" internally for length calculations
2. Converting "|" → "IJ" when displaying to users
3. See LingoController.php:58-61 and lingo.js:57-68

### Voice Control
Voice recognition (when enabled) listens for players spelling out letters. Uses annyang.js with language-specific recognition.

---

## 🤝 Contributing

This is a web-based version of Lingo using PHP and Javascript.
Original version: https://lingo.koenvh.nl

---

## 📄 License

See project files for license information.
