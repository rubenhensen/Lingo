<?php

/**
 * In-memory word database loaded from CSV files
 */
class Database
{
    private $words = [];
    private $wordsByLanguageAndLength = [];
    private $usedWords = [];

    function __construct()
    {
        $this->loadWordsFromCSV();
    }

    /**
     * Load all words from CSV files in parsers directory
     */
    private function loadWordsFromCSV()
    {
        $parserPath = __DIR__ . '/../parsers';
        $languages = ['Dutch' => 'nl', 'English' => 'en', 'German' => 'de'];

        foreach ($languages as $folder => $langCode) {
            // Load both choice (sane=1) and valid (sane=0) words
            $choiceFile = "$parserPath/$folder/raw_choice.txt.csv";
            $validFile = "$parserPath/$folder/raw_valid.txt.csv";

            if (file_exists($choiceFile)) {
                $this->loadCSVFile($choiceFile);
            }

            if (file_exists($validFile)) {
                $this->loadCSVFile($validFile);
            }
        }

        // Index words by language and length for faster lookups
        $this->indexWords();
    }

    /**
     * Load a single CSV file
     */
    private function loadCSVFile($filepath)
    {
        if (!file_exists($filepath)) {
            return;
        }

        $handle = fopen($filepath, 'r');
        if (!$handle) {
            return;
        }

        while (($line = fgets($handle)) !== false) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }

            $parts = explode(',', $line);
            if (count($parts) >= 4) {
                $word = strtoupper(trim($parts[0]));
                $language = trim($parts[1]);
                $characters = (int)trim($parts[2]);
                $sane = (int)trim($parts[3]);

                $this->words[] = [
                    'word' => $word,
                    'language' => $language,
                    'characters' => $characters,
                    'sane' => $sane
                ];
            }
        }

        fclose($handle);
    }

    /**
     * Index words by language and character count for faster access
     */
    private function indexWords()
    {
        foreach ($this->words as $wordData) {
            $lang = $wordData['language'];
            $length = $wordData['characters'];

            if (!isset($this->wordsByLanguageAndLength[$lang])) {
                $this->wordsByLanguageAndLength[$lang] = [];
            }

            if (!isset($this->wordsByLanguageAndLength[$lang][$length])) {
                $this->wordsByLanguageAndLength[$lang][$length] = [];
            }

            $this->wordsByLanguageAndLength[$lang][$length][] = $wordData;
        }
    }

    /**
     * Check if a word exists in the database
     */
    function wordExists(string $word, string $language)
    {
        $word = strtoupper($word);

        // Search through all words for this language
        if (!isset($this->wordsByLanguageAndLength[$language])) {
            return false;
        }

        foreach ($this->wordsByLanguageAndLength[$language] as $length => $wordList) {
            foreach ($wordList as $wordData) {
                if ($wordData['word'] === $word) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get a random word from the database
     */
    function getRandomWord(int $letters, string $language, string $startsWith = "")
    {
        if (!isset($this->wordsByLanguageAndLength[$language][$letters])) {
            // Fallback: return a default word
            return str_repeat("X", $letters);
        }

        $wordList = $this->wordsByLanguageAndLength[$language][$letters];

        // Prefer sane words (sane=1)
        $saneWords = array_filter($wordList, function($w) { return $w['sane'] == 1; });

        if (count($saneWords) > 0) {
            $wordList = $saneWords;
        }

        // Filter by starting letter if specified
        if ($startsWith !== "") {
            $filtered = array_filter($wordList, function($w) use ($startsWith) {
                return stripos($w['word'], strtoupper($startsWith)) === 0;
            });

            if (count($filtered) > 0) {
                $wordList = array_values($filtered);
            }
        }

        if (count($wordList) === 0) {
            return str_repeat("X", $letters);
        }

        // Try to avoid repeating words in the same session
        $sessionKey = "$language-$letters";
        if (!isset($this->usedWords[$sessionKey])) {
            $this->usedWords[$sessionKey] = [];
        }

        $usedInSession = $this->usedWords[$sessionKey];
        $availableWords = array_filter($wordList, function($w) use ($usedInSession) {
            return !in_array($w['word'], $usedInSession);
        });

        if (count($availableWords) === 0) {
            // Reset if all words have been used
            $this->usedWords[$sessionKey] = [];
            $availableWords = $wordList;
        }

        // Return random word from filtered list
        $randomIndex = array_rand($availableWords);
        $selectedWord = $availableWords[$randomIndex]['word'];

        // Track used words
        $this->usedWords[$sessionKey][] = $selectedWord;

        return $selectedWord;
    }

    /**
     * Get statistics about loaded words (useful for debugging)
     */
    function getStats()
    {
        $stats = [
            'total_words' => count($this->words),
            'by_language' => []
        ];

        foreach ($this->wordsByLanguageAndLength as $lang => $lengths) {
            $stats['by_language'][$lang] = [];
            foreach ($lengths as $length => $words) {
                $stats['by_language'][$lang][$length] = count($words);
            }
        }

        return $stats;
    }
}
