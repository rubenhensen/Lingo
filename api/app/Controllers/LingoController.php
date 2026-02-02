<?php
namespace Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class LingoController
{
    protected $container;

    public function __construct($container)
    {
        $this->container = $container;
    }

    /**
     * Render page
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return mixed
     */
    public function view(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        return $this->container->renderer->render($response, "/play.php", [
            "language" => $request->getAttribute("language"),
            "page" => ltrim($request->getUri()->getPath())
        ]);
    }

    /**
     * Check answer correct (Team-based version)
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return int
     */
    public function check(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        $guess = strtoupper($_POST["word"]);
        $rightWord = strtoupper($_SESSION["game"]["current_word"]);
        $language = $_POST["language"];
        $isTimeout = isset($_POST["timeout"]) && $_POST["timeout"] === "true";

        $resultArray = [
            "letters" => [],
            "error" => null,
            "win" => false,
            "teamSwitch" => false,
            "gameOver" => false,
            "currentTeam" => $_SESSION["game"]["current_team"],
            "currentTry" => $_SESSION["game"]["current_try"],
            "team1Score" => $_SESSION["game"]["team1"]["score"],
            "team2Score" => $_SESSION["game"]["team2"]["score"]
        ];

        // Handle timeout - stay on same row, add hint letter, switch teams
        if($isTimeout) {
            // Don't increment try, just add a hint letter and switch teams
            $_SESSION["game"]["current_team"] = ($_SESSION["game"]["current_team"] == 1) ? 2 : 1;
            $_SESSION["game"]["aid_letter_count"] = min($_SESSION["game"]["aid_letter_count"] + 1, $_SESSION["game"]["current_word_length"]);

            $resultArray["teamSwitch"] = true;
            $resultArray["newAidLetters"] = $this->getAidLetters(
                $_SESSION["game"]["current_word"],
                $_SESSION["game"]["language"],
                $_SESSION["game"]["aid_letter_count"]
            );

            $resultArray["currentTeam"] = $_SESSION["game"]["current_team"];
            $resultArray["currentTry"] = $_SESSION["game"]["current_try"];
            return $response->getBody()->write(json_encode($resultArray));
        }

        $database = new \Database();
        if($database->wordExists($guess, $language)) {
            /**
             * Dutch counts the IJ as one character, replace with | to solve double character issues
             */
            if($language == "nl") {
                $guess = str_replace("IJ", "|", $guess);
                $rightWord = str_replace("IJ", "|", $rightWord);
            }

            $rightWordArray = str_split($rightWord);

            /**
             * If letters are equal
             */
            for ($i = 0; $i < strlen($rightWord); $i++) {
                if ($guess[$i] == $rightWord[$i]) {
                    $resultArray["letters"][$i] = 2;
                    unset($rightWordArray[array_search($guess[$i], $rightWordArray)]); //Remove letter from the word array, so it doesn't become yellow too.

                    // Add this position to aided positions (correctly guessed letters become aided)
                    if(!isset($_SESSION["game"]["aid_letter_positions"])) {
                        $_SESSION["game"]["aid_letter_positions"] = [];
                    }
                    if(!in_array($i, $_SESSION["game"]["aid_letter_positions"])) {
                        $_SESSION["game"]["aid_letter_positions"][] = $i;
                    }
                }
            }

            /**
             * If letter is right, but not in the right place
             */
            for ($i = 0; $i < strlen($rightWord); $i++) {
                if ($guess[$i] != $rightWord[$i] && in_array($guess[$i], $rightWordArray)) { //If not the same place, but in the word.
                    $resultArray["letters"][$i] = 1;
                    unset($rightWordArray[array_search($guess[$i], $rightWordArray)]);
                }
            }

            /**
             * Else, set to zero.
             */
            for ($i = 0; $i < strlen($rightWord); $i++) {
                if(!array_key_exists($i, $resultArray["letters"])) {
                    $resultArray["letters"][$i] = 0;
                }
            }

        } else {
            // Word doesn't exist in database - invalid word
            $resultArray["error"] = $guess;

            // Invalid word - stay on same row, add hint letter, switch teams
            $_SESSION["game"]["current_team"] = ($_SESSION["game"]["current_team"] == 1) ? 2 : 1;
            $_SESSION["game"]["aid_letter_count"] = min($_SESSION["game"]["aid_letter_count"] + 1, $_SESSION["game"]["current_word_length"]);

            $resultArray["teamSwitch"] = true;
            $resultArray["newAidLetters"] = $this->getAidLetters(
                $_SESSION["game"]["current_word"],
                $_SESSION["game"]["language"],
                $_SESSION["game"]["aid_letter_count"]
            );

            $resultArray["currentTeam"] = $_SESSION["game"]["current_team"];
            $resultArray["currentTry"] = $_SESSION["game"]["current_try"];

            return $response->getBody()->write(json_encode($resultArray));
        }

        if($rightWord == $guess){
            $resultArray["win"] = true;

            // Award points based on try count
            $currentTeam = $_SESSION["game"]["current_team"];
            $tryCount = $_SESSION["game"]["current_try"];
            $points = max(1, 6 - $tryCount); // 5,4,3,2,1 for tries 1-5, minimum 1 for try 6

            $_SESSION["game"]["team" . $currentTeam]["score"] += $points;
            $resultArray["team" . $currentTeam . "Score"] = $_SESSION["game"]["team" . $currentTeam]["score"];
            $resultArray["pointsAwarded"] = $points;

            // Move to number entry phase after correct guess
            $_SESSION["game"]["phase"] = "number_entry";
            $_SESSION["game"]["winning_team"] = $currentTeam;

        } else {
            // Wrong guess (valid word, but incorrect)
            $_SESSION["game"]["current_try"]++;

            // Going from try 5 to try 6: switch teams (other team gets final chance)
            if($_SESSION["game"]["current_try"] == 6) {
                $_SESSION["game"]["current_team"] = ($_SESSION["game"]["current_team"] == 1) ? 2 : 1;
                $resultArray["teamSwitch"] = true;
            }

            // Try 6 failed: game over, show correct word, load new word
            if($_SESSION["game"]["current_try"] > 6) {
                $resultArray["gameOver"] = true;

                // Save correct word before loading next word
                $correctWord = $_SESSION["game"]["current_word"];
                $language = $_SESSION["game"]["language"];
                if($language == "nl") {
                    $correctWord = str_replace("|", "IJ", $correctWord);
                }
                $resultArray["correctWord"] = $correctWord;

                // Load next word (current_team stays as the team that had try 6)
                $this->loadNextWord();
            }
            // Otherwise same team continues with next try
        }

        $resultArray["currentTeam"] = $_SESSION["game"]["current_team"];
        $resultArray["currentTry"] = $_SESSION["game"]["current_try"];

        return $response->getBody()->write(json_encode($resultArray));
    }

    /**
     * Load next word and reset try counters
     */
    private function loadNextWord($round = null)
    {
        $database = new \Database();

        if($round !== null) {
            $_SESSION["game"]["round"] = $round;
        }

        $currentRound = $_SESSION["game"]["round"];
        $letters = ($currentRound == 1) ? 5 : 6;

        $_SESSION["game"]["current_word"] = $database->getRandomWord($letters, $_SESSION["game"]["language"], "");
        $_SESSION["game"]["current_word_length"] = $letters;

        // Keep current_team as is - the team that had try 6 starts the next word
        // (This is fair since they only got 1 try while the other team got 5)

        $_SESSION["game"]["current_try"] = 1;
        $_SESSION["game"]["aid_letter_count"] = 1;
        $_SESSION["game"]["aid_letter_positions"] = []; // Reset all revealed positions
        $_SESSION["game"]["random_aid_positions"] = []; // Reset random aid positions
        $_SESSION["game"]["phase"] = "word_guess";
    }

    /**
     * Get next word (API endpoint)
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return int
     */
    public function nextWord(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        $round = isset($_POST["round"]) ? $_POST["round"] : null;
        $this->loadNextWord($round);

        $aidLetters = $this->getAidLetters(
            $_SESSION["game"]["current_word"],
            $_SESSION["game"]["language"],
            1
        );

        $resultArray = [
            "aidLetters" => $aidLetters,
            "round" => $_SESSION["game"]["round"]
        ];

        return $response->getBody()->write(json_encode($resultArray));
    }

    /**
     * Submit a number after correct guess
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return int
     */
    public function submitNumber(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        $teamNumber = $_POST["team"];
        $number = $_POST["number"];

        $teamKey = "team" . $teamNumber;

        // Find position of number in grid
        $grid = $_SESSION["game"][$teamKey]["bingo_grid"];
        $foundRow = -1;
        $foundCol = -1;

        for($row = 0; $row < 5; $row++) {
            for($col = 0; $col < 5; $col++) {
                if($grid[$row][$col] == $number) {
                    $foundRow = $row;
                    $foundCol = $col;
                    break;
                }
            }
            if($foundRow != -1) break;
        }

        $resultArray = [
            "success" => false,
            "lingo" => false
        ];

        if($foundRow != -1) {
            // Add to filled positions
            $_SESSION["game"][$teamKey]["filled_positions"][] = [$foundRow, $foundCol];

            // Check for Lingo
            $lingo = $this->checkLingoBackend($teamNumber);

            if($lingo) {
                $_SESSION["game"][$teamKey]["score"] += 10;
                $resultArray["lingo"] = true;
            }

            $resultArray["success"] = true;
            $resultArray["score"] = $_SESSION["game"][$teamKey]["score"];
        }

        return $response->getBody()->write(json_encode($resultArray));
    }

    /**
     * Check for Lingo (complete line)
     */
    private function checkLingoBackend($teamNumber)
    {
        $teamKey = "team" . $teamNumber;
        $filled = $_SESSION["game"][$teamKey]["filled_positions"];
        $completedLines = $_SESSION["game"][$teamKey]["completed_lines"];

        // Create filled map
        $filledMap = [];
        for($i = 0; $i < 5; $i++) {
            $filledMap[$i] = [false, false, false, false, false];
        }
        foreach($filled as $pos) {
            $filledMap[$pos[0]][$pos[1]] = true;
        }

        $hasNewLine = false;

        // Check rows
        for($row = 0; $row < 5; $row++) {
            $complete = true;
            for($col = 0; $col < 5; $col++) {
                if(!$filledMap[$row][$col]) {
                    $complete = false;
                    break;
                }
            }
            if($complete) {
                $lineId = "row-" . $row;
                if(!in_array($lineId, $completedLines)) {
                    $completedLines[] = $lineId;
                    $hasNewLine = true;
                }
            }
        }

        // Check columns
        for($col = 0; $col < 5; $col++) {
            $complete = true;
            for($row = 0; $row < 5; $row++) {
                if(!$filledMap[$row][$col]) {
                    $complete = false;
                    break;
                }
            }
            if($complete) {
                $lineId = "col-" . $col;
                if(!in_array($lineId, $completedLines)) {
                    $completedLines[] = $lineId;
                    $hasNewLine = true;
                }
            }
        }

        // Check diagonals
        $complete = true;
        for($i = 0; $i < 5; $i++) {
            if(!$filledMap[$i][$i]) {
                $complete = false;
                break;
            }
        }
        if($complete) {
            $lineId = "diag-1";
            if(!in_array($lineId, $completedLines)) {
                $completedLines[] = $lineId;
                $hasNewLine = true;
            }
        }

        $complete = true;
        for($i = 0; $i < 5; $i++) {
            if(!$filledMap[$i][4 - $i]) {
                $complete = false;
                break;
            }
        }
        if($complete) {
            $lineId = "diag-2";
            if(!in_array($lineId, $completedLines)) {
                $completedLines[] = $lineId;
                $hasNewLine = true;
            }
        }

        $_SESSION["game"][$teamKey]["completed_lines"] = $completedLines;

        // If Lingo achieved, generate new grid for this team
        if($hasNewLine) {
            $_SESSION["game"][$teamKey]["bingo_grid"] = $this->generateBingoGrid();
            $_SESSION["game"][$teamKey]["filled_positions"] = $this->getPrefilledPositions();
            $_SESSION["game"][$teamKey]["completed_lines"] = [];
        }

        return $hasNewLine;
    }

    /**
     * Get right word for the end of the game
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return int
     */
    public function right(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        // Support both old single-player and new team format
        $word = isset($_SESSION["game"]["current_word"])
            ? $_SESSION["game"]["current_word"]
            : $_SESSION["word"];

        // Convert | back to IJ for Dutch words when displaying
        $language = isset($_SESSION["game"]["language"]) ? $_SESSION["game"]["language"] : $_SESSION["language"];
        if($language == "nl") {
            $word = str_replace("|", "IJ", $word);
        }

        $resultArray = [
            "word" => $word
        ];
        return $response->getBody()->write(json_encode($resultArray));
    }

    /**
     * Initialize new game
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return int
     */
    public function init(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        $language = $_POST["language"];
        $letters = $_POST["letters"];

        $database = new \Database();
        $_SESSION["word"] = $database->getRandomWord($letters, $language, isset($_POST["start"]) ? $_POST["start"] : "");

        $aidLetters = [];
        if($language == "nl") {
            $word = str_replace("IJ", "|", $_SESSION["word"]); //Convert IJ to | if Dutch
        } else {
            $word = $_SESSION["word"];
        }

        $amount = $_POST["amount"];
        $first = ($_POST["first"] == "true");
        $wordArray = str_split($word);
        $randomLetters = array_rand($wordArray, $amount); //Pick random indexes from the word
        if(!is_array($randomLetters)) {
            $randomLetters = [$randomLetters]; //Make sure output is an array (with just one aid letter)
        }
        if($first && !in_array(0, $randomLetters)){
            array_pop($randomLetters);
            $randomLetters[] = 0;
        }
        //var_dump($wordArray);
        //var_dump($randomLetters);

        foreach($randomLetters as $letter) {
            $aidLetters[$letter] = ($wordArray[$letter] == "|" ? "IJ" : $wordArray[$letter]); //Convert | back to IJ
        }
        return $response->getBody()->write(json_encode($aidLetters));
    }

    /**
     * Initialize new team game
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return int
     */
    public function initTeamGame(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        $language = $_POST["language"];

        $database = new \Database();

        $firstWord = $database->getRandomWord(5, $language, ""); // Round 1 = 5 letters

        // Initialize game state
        $_SESSION["game"] = [
            "phase" => "word_guess",
            "round" => 1,
            "current_word" => $firstWord,
            "current_word_length" => 5,
            "current_team" => 1,
            "current_try" => 1,
            "aid_letter_count" => 1,
            "aid_letter_positions" => [], // Track which positions have been revealed (guessed + aided)
            "random_aid_positions" => [], // Track random aid positions separately
            "language" => $language,
            "team1" => [
                "score" => 0,
                "bingo_grid" => $this->generateBingoGrid(),
                "filled_positions" => $this->getPrefilledPositions(),
                "completed_lines" => []
            ],
            "team2" => [
                "score" => 0,
                "bingo_grid" => $this->generateBingoGrid(),
                "filled_positions" => $this->getPrefilledPositions(),
                "completed_lines" => []
            ],
            "bonus" => [
                "active" => false
            ]
        ];

        // Get aid letters for first word
        $aidLetters = $this->getAidLetters($_SESSION["game"]["current_word"], $language, 1);

        $resultArray = [
            "aidLetters" => $aidLetters,
            "team1Grid" => $_SESSION["game"]["team1"]["bingo_grid"],
            "team2Grid" => $_SESSION["game"]["team2"]["bingo_grid"],
            "team1Filled" => $_SESSION["game"]["team1"]["filled_positions"],
            "team2Filled" => $_SESSION["game"]["team2"]["filled_positions"]
        ];

        return $response->getBody()->write(json_encode($resultArray));
    }

    /**
     * Generate a unique 5x5 bingo grid with numbers 1-25
     */
    private function generateBingoGrid()
    {
        $numbers = range(1, 25);
        shuffle($numbers);

        $grid = [];
        for($i = 0; $i < 5; $i++) {
            $grid[$i] = array_slice($numbers, $i * 5, 5);
        }

        return $grid;
    }

    /**
     * Get 8 random pre-filled positions with max 3 per line
     */
    private function getPrefilledPositions()
    {
        $filled = [];
        $rowCounts = [0, 0, 0, 0, 0];
        $colCounts = [0, 0, 0, 0, 0];
        $diag1Count = 0;
        $diag2Count = 0;

        // Generate all possible positions
        $allPositions = [];
        for($row = 0; $row < 5; $row++) {
            for($col = 0; $col < 5; $col++) {
                $allPositions[] = [$row, $col];
            }
        }
        shuffle($allPositions);

        // Select 8 positions, ensuring max 3 per line
        foreach($allPositions as $pos) {
            if(count($filled) >= 8) break;

            $row = $pos[0];
            $col = $pos[1];

            // Check constraints
            if($rowCounts[$row] >= 3) continue;
            if($colCounts[$col] >= 3) continue;
            if($row === $col && $diag1Count >= 3) continue;
            if($row === (4 - $col) && $diag2Count >= 3) continue;

            // Add position
            $filled[] = $pos;
            $rowCounts[$row]++;
            $colCounts[$col]++;
            if($row === $col) $diag1Count++;
            if($row === (4 - $col)) $diag2Count++;
        }

        return $filled;
    }

    /**
     * Get aid letters for a word
     * This returns all positions that should be revealed (both randomly aided and correctly guessed)
     */
    private function getAidLetters($word, $language, $randomAidCount)
    {
        $aidLetters = [];
        if($language == "nl") {
            $word = str_replace("IJ", "|", $word);
        }

        $wordArray = str_split($word);

        // Get all previously revealed positions (includes correctly guessed letters)
        $allRevealedPositions = isset($_SESSION["game"]["aid_letter_positions"])
            ? $_SESSION["game"]["aid_letter_positions"]
            : [];

        // Track random aid positions separately
        if(!isset($_SESSION["game"]["random_aid_positions"])) {
            $_SESSION["game"]["random_aid_positions"] = [];
        }
        $randomAidPositions = $_SESSION["game"]["random_aid_positions"];

        // Always include position 0 (first letter) as random aid
        if(!in_array(0, $randomAidPositions)) {
            $randomAidPositions[] = 0;
            if(!in_array(0, $allRevealedPositions)) {
                $allRevealedPositions[] = 0;
            }
        }

        // Add new random aid positions until we reach the desired count
        while(count($randomAidPositions) < $randomAidCount && count($randomAidPositions) < count($wordArray)) {
            $availablePositions = array_diff(array_keys($wordArray), $allRevealedPositions);

            // Never reveal the last letter as a hint
            $lastPosition = count($wordArray) - 1;
            $availablePositions = array_diff($availablePositions, [$lastPosition]);

            if(empty($availablePositions)) break;

            $newPosition = $availablePositions[array_rand($availablePositions)];
            $randomAidPositions[] = $newPosition;
            $allRevealedPositions[] = $newPosition;
        }

        // Store updated positions in session
        $_SESSION["game"]["random_aid_positions"] = $randomAidPositions;
        $_SESSION["game"]["aid_letter_positions"] = $allRevealedPositions;

        // Build aid letters array from ALL revealed positions
        foreach($allRevealedPositions as $position) {
            $aidLetters[$position] = ($wordArray[$position] == "|" ? "IJ" : $wordArray[$position]);
        }

        return $aidLetters;
    }

    /**
     * Initialize bonus round
     *
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @param $args
     * @return int
     */
    public function initBonus(ServerRequestInterface $request, ResponseInterface $response, $args)
    {
        $database = new \Database();
        $language = $_SESSION["game"]["language"];

        // Get a 10-letter word for bonus round
        $bonusWord = $database->getRandomWord(10, $language, "");

        $_SESSION["game"]["bonus"] = [
            "active" => true,
            "word" => $bonusWord
        ];

        // Convert | back to IJ for Dutch words when displaying
        $displayWord = $bonusWord;
        if($language == "nl") {
            $displayWord = str_replace("|", "IJ", $displayWord);
        }

        $resultArray = [
            "word" => $displayWord
        ];

        return $response->getBody()->write(json_encode($resultArray));
    }
}