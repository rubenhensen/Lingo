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

    /**
     * Start bonus round
     */
    start: function(teamNumber, word) {
        Bonus.active = true;
        Bonus.correctWord = word.toUpperCase();
        Bonus.teamNumber = teamNumber;
        Bonus.iteration = 0;
        Bonus.revealedCorrect = [];
        Bonus.paused = false;

        // Create initial complete scramble
        Bonus.scrambledPositions = Bonus.createScramble();

        // Show bonus overlay
        $("#bonus-overlay").fadeIn();
        var teamName = (teamNumber === 1) ? Lingo.team1Name : Lingo.team2Name;
        $("#bonus-team").html(teamName);
        $("#bonus-input-container").hide();
        $("#bonus-guess-input").val("");

        Bonus.renderWord();

        // Start auto-reveal animation
        Bonus.startAnimation();

        // Listen for space bar
        $(document).off("keydown.bonus").on("keydown.bonus", function(e) {
            if(e.keyCode === 32 && Bonus.active && !Bonus.paused) { // Space bar
                e.preventDefault();
                Bonus.pause();
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
     */
    renderWord: function() {
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

            container.append(div);
        }
    },

    /**
     * Start auto-reveal animation
     */
    startAnimation: function() {
        Bonus.animationInterval = setInterval(function() {
            Bonus.revealNextPair();
        }, 3000);
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

        // Pick 1 letter to reveal correctly
        var correctIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];

        // Move this letter to its correct position
        Bonus.scrambledPositions[correctIndex] = correctIndex;
        Bonus.revealedCorrect.push(correctIndex);

        // Pick 1 other letter and move it to a wrong position (shuffle among unrevealed)
        if(unrevealed.length > 1) {
            var wrongCandidates = unrevealed.filter(function(i) { return i !== correctIndex; });
            if(wrongCandidates.length > 0) {
                var wrongIndex = wrongCandidates[Math.floor(Math.random() * wrongCandidates.length)];

                // Shuffle it to a different wrong position
                var possiblePositions = [];
                for(var i = 0; i < Bonus.correctWord.length; i++) {
                    if(Bonus.revealedCorrect.indexOf(i) === -1 && i !== wrongIndex) {
                        possiblePositions.push(i);
                    }
                }

                if(possiblePositions.length > 0) {
                    var newPos = possiblePositions[Math.floor(Math.random() * possiblePositions.length)];

                    // Swap
                    var temp = Bonus.scrambledPositions[wrongIndex];
                    Bonus.scrambledPositions[wrongIndex] = Bonus.scrambledPositions[newPos];
                    Bonus.scrambledPositions[newPos] = temp;
                }
            }
        }

        Bonus.iteration++;
        Bonus.renderWord();
    },

    /**
     * Pause animation and show input
     */
    pause: function() {
        Bonus.paused = true;
        Bonus.stopAnimation();
        $("#bonus-input-container").fadeIn();
        $("#bonus-guess-input").focus();
    },

    /**
     * Resume animation
     */
    resume: function() {
        Bonus.paused = false;
        $("#bonus-input-container").fadeOut();
        Bonus.startAnimation();
    },

    /**
     * Submit guess
     */
    submitGuess: function() {
        var guess = $("#bonus-guess-input").val().trim().toUpperCase();

        if(guess.length !== Bonus.correctWord.length) {
            alert("Please enter a " + Bonus.correctWord.length + "-letter word");
            return;
        }

        if(guess === Bonus.correctWord) {
            // Correct!
            if(Bonus.teamNumber === 1) {
                Lingo.team1Score += 10;
            } else {
                Lingo.team2Score += 10;
            }
            Lingo.updateScoreDisplay();

            var audio = new Audio("./audio/guesscorrect.mp3");
            audio.play();

            var teamName = (Bonus.teamNumber === 1) ? Lingo.team1Name : Lingo.team2Name;
            alert("Correct! " + teamName + " earned 10 bonus points!");
            Bonus.end(true);
        } else {
            // Wrong!
            if(Bonus.teamNumber === 1) {
                Lingo.team1Score -= 5;
            } else {
                Lingo.team2Score -= 5;
            }
            Lingo.updateScoreDisplay();

            var audio = new Audio("./audio/letter0.mp3");
            audio.play();

            var teamName = (Bonus.teamNumber === 1) ? Lingo.team1Name : Lingo.team2Name;
            alert("Wrong! " + teamName + " loses 5 points. Animation continues...");
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
