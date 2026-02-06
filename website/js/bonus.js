var Bonus = {
    active: false,
    word: "",
    correctWord: "",
    teamNumber: 0,
    scrambledPositions: [],
    revealedCorrect: [],
    iteration: 0,
    animationInterval: null,
    paused: false,
    intervalTime: 3000, // Default 3 seconds, can be set from menu

    /**
     * Start bonus round
     */
    start: function(teamNumber, word) {
        Bonus.active = true;
        Bonus.correctWord = word.toUpperCase();
        Bonus.teamNumber = teamNumber; // Default team (not used anymore)
        Bonus.guessingTeam = null; // Track which team is currently guessing
        Bonus.iteration = 0;
        Bonus.revealedCorrect = [];
        Bonus.paused = false;

        // Create initial complete scramble
        Bonus.scrambledPositions = Bonus.createScramble();

        // Show bonus overlay
        $("#bonus-overlay").fadeIn();
        $("#bonus-team").html("Bonus Ronde");
        $("#bonus-input-container").hide();
        $("#bonus-guess-input").val("");

        Bonus.renderWord();

        // Start auto-reveal animation
        Bonus.startAnimation();

        // Listen for left/right arrow keys
        $(document).off("keydown.bonus").on("keydown.bonus", function(e) {
            if(Bonus.active && !Bonus.paused) {
                if(e.keyCode === 37) { // Left arrow - Team 1 guesses
                    e.preventDefault();
                    Bonus.pause(1);
                } else if(e.keyCode === 39) { // Right arrow - Team 2 guesses
                    e.preventDefault();
                    Bonus.pause(2);
                }
            }
        });
    },

    /**
     * Create a scrambled version of the word
     */
    createScramble: function() {
        var positions = [];
        for(var i = 0; i < Bonus.correctWord.length; i++) {
            positions.push(i);
        }

        // Fisher-Yates shuffle
        for(var i = positions.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = positions[i];
            positions[i] = positions[j];
            positions[j] = temp;
        }

        return positions;
    },

    /**
     * Render the word with current scramble and revealed letters
     * @param {Array} swapPositions - Array of two positions that were just swapped (for animation)
     */
    renderWord: function(swapPositions) {
        var container = $("#bonus-word");
        container.html("");

        for(var i = 0; i < Bonus.correctWord.length; i++) {
            var letter = Bonus.correctWord[Bonus.scrambledPositions[i]];
            var div = $("<div class='bonus-letter'></div>");
            div.html(letter);

            // Check if this position has been revealed as correct
            if(Bonus.revealedCorrect.indexOf(i) !== -1) {
                div.addClass("bonus-correct");
            }

            // Add swap animation if this position was just swapped
            if(swapPositions && swapPositions.indexOf(i) !== -1) {
                div.addClass("bonus-swap");
            }

            container.append(div);
        }

        // Remove swap animation after it completes
        if(swapPositions) {
            setTimeout(function() {
                $(".bonus-letter").removeClass("bonus-swap");
            }, 600);
        }
    },

    /**
     * Start auto-reveal animation
     */
    startAnimation: function() {
        Bonus.animationInterval = setInterval(function() {
            Bonus.revealNextPair();
        }, Bonus.intervalTime);
    },

    /**
     * Stop animation
     */
    stopAnimation: function() {
        if(Bonus.animationInterval) {
            clearInterval(Bonus.animationInterval);
            Bonus.animationInterval = null;
        }
    },

    /**
     * Reveal next pair of letters (1 correct, 1 wrong)
     * Swaps two letters: one ends up in the correct position
     */
    revealNextPair: function() {
        if(!Bonus.active || Bonus.paused) return;

        // Find positions not yet revealed correctly
        var unrevealed = [];
        for(var i = 0; i < Bonus.correctWord.length; i++) {
            if(Bonus.revealedCorrect.indexOf(i) === -1) {
                unrevealed.push(i);
            }
        }

        if(unrevealed.length === 0) {
            // All letters revealed - end bonus
            Bonus.end(false);
            return;
        }

        // Pick a position to reveal correctly
        var targetPos = unrevealed[Math.floor(Math.random() * unrevealed.length)];

        // Find where the correct letter for targetPos is currently located
        var currentPosOfCorrectLetter = -1;
        for(var i = 0; i < Bonus.scrambledPositions.length; i++) {
            if(Bonus.scrambledPositions[i] === targetPos) {
                currentPosOfCorrectLetter = i;
                break;
            }
        }

        // Swap the letters at targetPos and currentPosOfCorrectLetter
        // This moves the correct letter to targetPos and the other letter away
        var temp = Bonus.scrambledPositions[targetPos];
        Bonus.scrambledPositions[targetPos] = Bonus.scrambledPositions[currentPosOfCorrectLetter];
        Bonus.scrambledPositions[currentPosOfCorrectLetter] = temp;

        // Mark targetPos as revealed
        Bonus.revealedCorrect.push(targetPos);

        Bonus.iteration++;

        // Render with swap animation on the two positions that were swapped
        Bonus.renderWord([targetPos, currentPosOfCorrectLetter]);
    },

    /**
     * Pause animation and show input
     */
    pause: function(teamNumber) {
        Bonus.paused = true;
        Bonus.guessingTeam = teamNumber;
        Bonus.stopAnimation();

        var teamName = (teamNumber === 1) ? Lingo.team1Name : Lingo.team2Name;
        $("#bonus-team").html(teamName + " gokt!");

        $("#bonus-input-container").fadeIn();
        $("#bonus-guess-input").focus();
    },

    /**
     * Resume animation
     */
    resume: function() {
        Bonus.paused = false;
        Bonus.guessingTeam = null;
        $("#bonus-team").html("Bonus Ronde");
        $("#bonus-input-container").fadeOut();

        // Wait before restarting animation to prevent alert Enter from being processed
        setTimeout(function() {
            Bonus.startAnimation();
        }, 200);
    },

    /**
     * Submit guess
     */
    submitGuess: function() {
        var guess = $("#bonus-guess-input").val().trim().toUpperCase();

        if(guess.length !== Bonus.correctWord.length) {
            alert("Voer een woord van " + Bonus.correctWord.length + " letters in");
            return;
        }

        var teamNumber = Bonus.guessingTeam;
        if(!teamNumber) {
            alert("Fout: geen team geselecteerd");
            return;
        }

        if(guess === Bonus.correctWord) {
            // Correct!
            if(teamNumber === 1) {
                Lingo.team1Score += 10;
            } else {
                Lingo.team2Score += 10;
            }
            Lingo.updateScoreDisplay();

            var audio = new Audio("./audio/guesscorrect.mp3");
            audio.play();

            var teamName = (teamNumber === 1) ? Lingo.team1Name : Lingo.team2Name;
            alert("Correct! " + teamName + " krijgt 10 bonuspunten!");
            Bonus.end(true);
        } else {
            // Wrong!
            if(teamNumber === 1) {
                Lingo.team1Score -= 5;
            } else {
                Lingo.team2Score -= 5;
            }
            Lingo.updateScoreDisplay();

            var audio = new Audio("./audio/letter0.mp3");
            audio.play();

            var teamName = (teamNumber === 1) ? Lingo.team1Name : Lingo.team2Name;
            alert("Fout! " + teamName + " verliest 5 punten. Animatie gaat verder...");
            $("#bonus-guess-input").val("");
            Bonus.resume();
        }
    },

    /**
     * End bonus round
     */
    end: function(won) {
        Bonus.active = false;
        Bonus.stopAnimation();

        $(document).off("keydown.bonus");

        // Show final word
        if(won) {
            $("#bonus-word .bonus-letter").addClass("bonus-correct");
        }

        setTimeout(function() {
            $("#bonus-overlay").fadeOut(function() {
                // Generate new grid for the team that achieved Lingo
                if(Lingo.lingoTeam) {
                    Lingo.regenerateGridForTeam(Lingo.lingoTeam);
                    Lingo.lingoTeam = null;
                }

                // Check if round is complete
                if(Lingo.round === 1) {
                    // Transition to Round 2
                    Lingo.startRound2();
                } else if(Lingo.round === 2) {
                    // Show final score
                    Lingo.showFinalScore();
                }
            });
        }, won ? 1000 : 2000);
    }
};

// Handle bonus guess submission
$(document).ready(function() {
    $("#bonus-submit-btn").click(function() {
        Bonus.submitGuess();
    });

    $("#bonus-guess-input").keypress(function(e) {
        if(e.which === 13) {
            Bonus.submitGuess();
        }
    });
});
