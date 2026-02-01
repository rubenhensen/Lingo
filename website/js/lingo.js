var Lingo = {
    language: "",
    time: 0,
    tries: 6, // Max 6 tries (5 for team 1, 1 for team 2)
    letters: 5,
    startLetters: [],
    rightLetters: [],
    size: 50,
    mobile: false,
    previousContent: null,
    enterPressed: true,

    // Team game state
    currentTeam: 1,
    currentTry: 1,
    team1Score: 0,
    team2Score: 0,
    team1Name: "Team 1",
    team2Name: "Team 2",
    round: 1,
    phase: "word_guess", // word_guess | number_entry | bonus_round | round_transition | game_over

    /**
     * Initialize the object
     */
    init: function () {
        Lingo.reset();

        // Update score display to show active team
        Lingo.updateScoreDisplay();

        $(".lingo-letter > div").click(function () {
            $(this).focus();
        });

        $(".lingo-letter > div").focus(function () {
            Lingo.previousContent = $(this).html().trim().toUpperCase(); //Set previousContent for mobile (to recognise the new character)
        });

        $(".lingo-letter > div").keydown(function (e) {
            e.preventDefault();
            Lingo.previousContent = $(this).html().trim().toUpperCase();
        });

        $(".lingo-letter > div").bind("input keyup", function (e) {

            if(typeof e.keyCode === "undefined" || e.keyCode === 229) { //If mobile
                var difference = getDifference(Lingo.previousContent, $(this).html().trim().toUpperCase()); //Get new character
                if(difference.trim().length === 0 || $(this).html().trim().indexOf("<BR>") !== -1) {
                    $(this).html(Lingo.previousContent);
                } else {
                    e.keyCode = difference.charCodeAt(0); //Set keycode from new character
                }
            }
            e.preventDefault();
            //console.log("keyCode: " + e.keyCode);
            var currentIndex = parseInt($(this).parent().parent().index()); //Get current square index in row

            if (e.keyCode === 46) { //delete
                if(!Lingo.enterPressed) {
                    $(this).html(".");
                }
            } else if (e.keyCode === 8) { //backspace
                if(!Lingo.enterPressed) {
                    if ($(this).html().trim() === ".") {
                        $(".lingo-current > td > .lingo-letter > div").eq(currentIndex - 1).html(".").focus();
                    }
                    $(this).html(".");
                }
            } else if (e.keyCode === 74 && Lingo.language === "nl") { // j
                if(!Lingo.enterPressed) {
                    if (($(this).html().trim() === "I" || Lingo.previousContent === "I") && $(this).parent().parent().is(":last-child")) {
                        $(this).html("IJ");
                    } else if ($(".lingo-current > td > .lingo-letter > div").eq(currentIndex - 1).html().trim() === "I") {
                        $(".lingo-current > td > .lingo-letter > div").eq(currentIndex - 1).html("IJ");
                        $(this).html(Lingo.previousContent);
                    } else {
                        $(this).html(String.fromCharCode(e.keyCode));
                        $(".lingo-current > td > .lingo-letter > div").eq(currentIndex + 1).focus();
                    }
                }
            } else if (e.keyCode === 37) { //arrow left
                $(".lingo-current > td > .lingo-letter > div").eq(currentIndex - 1).focus();
            } else if (e.keyCode === 39) { //arrow right
                $(".lingo-current > td > .lingo-letter > div").eq(currentIndex + 1).focus();
            } else if (e.keyCode === 13) { //enter
                if(!Lingo.enterPressed) {
                    $(this).blur();
                    Lingo.enterPressed = true; //Prevent multiple enters firing
                    Lingo.check();
                }
            } else if (String.fromCharCode(e.keyCode).match(/[A-Z]/i)) {
                if(!Lingo.enterPressed) {
                    $(this).html(String.fromCharCode(e.keyCode));
                    $(".lingo-current > td > .lingo-letter > div").eq(currentIndex + 1).focus();
                }
            }
        });

        if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
            console.log("Mobile on");
            Lingo.mobile = true;
            //$("div[contenteditable=false]").prop("contenteditable", true); //Make editable for mobile keyboard
            Lingo.setMobileSize();
            /*
            $(window).resize(function () {
                Lingo.setMobileSize();
            });
            */
        }

        $(".lingo-progress").outerWidth($(".lingo").outerWidth());

        //Start first guess
        var audio = new Audio("./audio/newletter.mp3");
        audio.play();
        Lingo.nextGuess();
    },

    setMobileSize: function () {
        var deviceWidth = $(window).width() > $(window).height() ? $(window).height() : $(window).width();
        var squareSize = (deviceWidth - ((parseInt(Lingo.letters) + 2) * 3)) / Lingo.letters; //Set width to screen width
        //console.log(squareSize);
        Lingo.setSize(Math.ceil(squareSize));

        //Fixed time bar to the top of the page
        $(".lingo").css({
            "margin-top": $(".lingo-progress").outerHeight() - 1
        });
        $(".lingo-progress").css({
            position: "fixed",
            top: "50px",
            left: $(".lingo").offset().left
        });
    },

    reset: function () {
        Lingo.stopTimer();
        $(".lingo-letter > div").off("click").off("keydown").off("keyup").off("focus");
        $(".lingo > tbody").html("");

        // Reset right letters to start letters (aid letters from server)
        Lingo.rightLetters = Object.assign({}, Lingo.startLetters);

        // Create rows based on tries count
        for(var i = 0; i < Lingo.tries; i++) {
            $(".lingo > tbody").append("<tr></tr>");
        }

        // Create columns based on letter count
        for(var i = 0; i < Lingo.letters; i++) {
            $(".lingo > tbody > tr").append("" +
                "<td>" +
                "<div class='lingo-letter'>" +
                "<div></div>" +
                "</div>" +
                "</td>");
        }
        $(".lingo-current").removeClass("lingo-current");
    },

    setSize: function (size) {
        Lingo.size = size;
        $(".lingo-letter, .lingo-letter > div").css({
            "width": size + "px",
            "height": size + "px",
            "font-size": (0.7 * parseInt(size)) + "px"
        });
    },
    
    check: function () {
        Lingo.stopTimer();

        var word = []; //Get all squares and put them in an array
        $('.lingo-current > td > div > div').each(function(i, selected){
            word[i] = $(selected).html().trim();
        });
        $.ajax({
            url: API_URL + "api/check",
            type: "POST",
            data: { word: word.join(""), language: Lingo.language },
            xhrFields: { withCredentials: true },
            success: function (data) {
            var json = JSON.parse(data);
            if(json.error !== null){
                // Invalid word - stay on same row, add hint letter, switch teams
                var audio = new Audio("./audio/timeup.mp3");
                audio.play();

                alert($(".lingo-doesNotExist").html().replace("%s", json.error));

                // Update aid letters (invalid word adds a hint)
                if(json.newAidLetters) {
                    Lingo.rightLetters = json.newAidLetters;
                    Lingo.startLetters = json.newAidLetters;
                }

                // Switch teams
                if(json.teamSwitch) {
                    Lingo.currentTeam = json.currentTeam;
                    Lingo.updateScoreDisplay();

                    var previousTeam = (json.currentTeam === 1) ? Lingo.team2Name : Lingo.team1Name;
                    var currentTeam = (json.currentTeam === 1) ? Lingo.team1Name : Lingo.team2Name;
                    alert(previousTeam + " used invalid word. " + currentTeam + "'s turn!");
                }

                // Clear current row and repopulate with updated aid letters
                Lingo.resetCurrentRow();
            } else {
                //Show state of each square, one by one, 220ms after each other
                $('.lingo-current > td > div').each(function(i, selected){
                    setTimeout(function () {
                        Lingo.showCheck(json, i, selected);
                    }, i * 220);
                });

                setTimeout(function () {
                    if(json.win){
                        var audio = new Audio("./audio/guesscorrect.mp3");
                        audio.play();

                        // Update scores
                        Lingo.team1Score = json.team1Score;
                        Lingo.team2Score = json.team2Score;
                        Lingo.updateScoreDisplay();

                        // Show points awarded
                        var winningTeam = json.currentTeam;
                        var teamName = (winningTeam === 1) ? Lingo.team1Name : Lingo.team2Name;
                        alert(teamName + " guessed correctly and earned " + json.pointsAwarded + " points!");

                        // Show number entry modal
                        $("#modal-backdrop").addClass("show");
                        Bingo.showNumberEntry(winningTeam, function(number) {
                            $("#modal-backdrop").removeClass("show");

                            // Mark the number on the grid
                            if(Bingo.markNumber(winningTeam, number)) {
                                // Check for Lingo
                                if(Bingo.checkLingo(winningTeam)) {
                                    Bingo.highlightLines(winningTeam);

                                    // Award 10 points for Lingo
                                    if(winningTeam === 1) {
                                        Lingo.team1Score += 10;
                                    } else {
                                        Lingo.team2Score += 10;
                                    }
                                    Lingo.updateScoreDisplay();

                                    var audio = new Audio("./audio/guesscorrect.mp3");
                                    audio.play();

                                    var winningTeamName = (winningTeam === 1) ? Lingo.team1Name : Lingo.team2Name;
                                    alert("LINGO! " + winningTeamName + " completed a line and earned 10 bonus points!");

                                    // Trigger bonus round
                                    Lingo.startBonusRound(winningTeam);
                                } else {
                                    // No Lingo, just continue to next word
                                    Lingo.loadNextWord();
                                }
                            }
                        });
                    } else {
                        // Wrong guess (valid word but incorrect)
                        if(json.gameOver) {
                            var audio = new Audio("./audio/guessfail.mp3");
                            audio.play();
                            Lingo.showCorrectWord(false, json.correctWord);
                        } else {
                            // Update try count
                            Lingo.currentTry = json.currentTry;

                            // Check if team switched (happens on try 6)
                            if(json.teamSwitch) {
                                Lingo.currentTeam = json.currentTeam;
                                Lingo.updateScoreDisplay();

                                var previousTeam = (json.currentTeam === 1) ? Lingo.team2Name : Lingo.team1Name;
                                var currentTeam = (json.currentTeam === 1) ? Lingo.team1Name : Lingo.team2Name;
                                alert(previousTeam + " exhausted their tries. " + currentTeam + " gets final chance!");
                            }

                            Lingo.nextGuess();
                        }
                    }
                }, Lingo.letters * 220);
            }
            }
        });
    },

    updateScoreDisplay: function() {
        $(".team1-score").html(Lingo.team1Score);
        $(".team2-score").html(Lingo.team2Score);

        // Highlight current team
        if(Lingo.currentTeam === 1) {
            $(".team1-score").parent().addClass("active-team");
            $(".team2-score").parent().removeClass("active-team");
        } else {
            $(".team2-score").parent().addClass("active-team");
            $(".team1-score").parent().removeClass("active-team");
        }
    },

    loadNextWord: function(round) {
        // Reset for next word
        Lingo.currentTeam = 1;
        Lingo.currentTry = 1;

        // Call backend to get next word
        var postData = {language: Lingo.language};
        if(round !== undefined) {
            postData.round = round;
        }

        $.ajax({
            url: API_URL + "api/next-word",
            type: "POST",
            data: postData,
            xhrFields: { withCredentials: true },
            success: function (data) {
                var json = JSON.parse(data);
                Lingo.rightLetters = json.aidLetters;
                Lingo.startLetters = json.aidLetters;
                Lingo.letters = (json.round == 1) ? 5 : 6;
                Lingo.reset();
                Lingo.init();
            }
        });
    },

    showCorrectWord: function(won, correctWord) {
        if(correctWord) {
            // Word provided directly (from gameOver response)
            $(".lingo-right").html(correctWord);
            $("#overlay").css({
                top: $(".lingo").position().top,
                left: "calc(50% - " + ($(".lingo").outerWidth() / 2) + "px)",
                height: $(".lingo").outerHeight() + $(".lingo-progress").outerHeight()
            });
            $("#overlay").outerWidth($(".lingo").outerWidth());
            $("#overlay").fadeIn();
        } else {
            // Fallback: fetch from API (for backwards compatibility)
            $.ajax({
                url: API_URL + "api/right",
                type: "POST",
                xhrFields: { withCredentials: true },
                success: function (data) {
                    var json = JSON.parse(data);
                    $(".lingo-right").html(json.word);
                    $("#overlay").css({
                        top: $(".lingo").position().top,
                        left: "calc(50% - " + ($(".lingo").outerWidth() / 2) + "px)",
                        height: $(".lingo").outerHeight() + $(".lingo-progress").outerHeight()
                    });
                    $("#overlay").outerWidth($(".lingo").outerWidth());
                    $("#overlay").fadeIn();
                }
            });
        }
    },

    startBonusRound: function(teamNumber) {
        // Store which team achieved Lingo
        Lingo.lingoTeam = teamNumber;

        // Get bonus word from server
        $.ajax({
            url: API_URL + "api/init-bonus",
            type: "POST",
            xhrFields: { withCredentials: true },
            success: function (data) {
                var json = JSON.parse(data);
                Bonus.start(teamNumber, json.word);
            }
        });
    },

    regenerateGridForTeam: function(teamNumber) {
        // Generate new bingo grid for team that achieved Lingo
        var newGrid = [];
        var numbers = [];
        for(var i = 1; i <= 25; i++) {
            numbers.push(i);
        }

        // Shuffle numbers
        for(var i = numbers.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = numbers[i];
            numbers[i] = numbers[j];
            numbers[j] = temp;
        }

        // Create 5x5 grid
        for(var row = 0; row < 5; row++) {
            newGrid[row] = numbers.slice(row * 5, (row + 1) * 5);
        }

        // Generate pre-filled positions with max 3 per line
        var filled = [];
        var rowCounts = [0, 0, 0, 0, 0];
        var colCounts = [0, 0, 0, 0, 0];
        var diag1Count = 0;
        var diag2Count = 0;

        var allPositions = [];
        for(var row = 0; row < 5; row++) {
            for(var col = 0; col < 5; col++) {
                allPositions.push([row, col]);
            }
        }

        // Shuffle positions
        for(var i = allPositions.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = allPositions[i];
            allPositions[i] = allPositions[j];
            allPositions[j] = temp;
        }

        // Select 8 positions with constraints
        for(var i = 0; i < allPositions.length && filled.length < 8; i++) {
            var pos = allPositions[i];
            var row = pos[0];
            var col = pos[1];

            // Check constraints
            if(rowCounts[row] >= 3) continue;
            if(colCounts[col] >= 3) continue;
            if(row === col && diag1Count >= 3) continue;
            if(row === (4 - col) && diag2Count >= 3) continue;

            // Add position
            filled.push(pos);
            rowCounts[row]++;
            colCounts[col]++;
            if(row === col) diag1Count++;
            if(row === (4 - col)) diag2Count++;
        }

        // Update Bingo state
        if(teamNumber === 1) {
            Bingo.team1Grid = newGrid;
            Bingo.team1Filled = filled;
            Bingo.team1CompletedLines = [];
        } else {
            Bingo.team2Grid = newGrid;
            Bingo.team2Filled = filled;
            Bingo.team2CompletedLines = [];
        }

        // Re-render the grid
        Bingo.renderGrid(teamNumber);
    },

    startRound2: function() {
        // Update round
        Lingo.round = 2;
        Lingo.letters = 6; // Round 2 uses 6-letter words
        $(".current-round").html("2");

        // Show transition screen
        $("#round-transition").fadeIn();
        $("#round-transition-number").html("2");

        setTimeout(function() {
            $("#round-transition").fadeOut(function() {
                // Load first word of Round 2
                Lingo.loadNextWord(2);
            });
        }, 3000);
    },

    showFinalScore: function() {
        $("#final-score-overlay").fadeIn();
        $("#team1-final-score").html(Lingo.team1Score);
        $("#team2-final-score").html(Lingo.team2Score);
        $("#team1-final-name").html(Lingo.team1Name);
        $("#team2-final-name").html(Lingo.team2Name);

        var winner;
        if(Lingo.team1Score > Lingo.team2Score) {
            winner = Lingo.team1Name;
            $("#winner-announcement").html(Lingo.team1Name + " Wins!").css("color", "#28a745");
        } else if(Lingo.team2Score > Lingo.team1Score) {
            winner = Lingo.team2Name;
            $("#winner-announcement").html(Lingo.team2Name + " Wins!").css("color", "#007bff");
        } else {
            winner = "Tie";
            $("#winner-announcement").html("It's a Tie!").css("color", "#ffc107");
        }

        var audio = new Audio("./audio/guesscorrect.mp3");
        audio.play();
    },

    showCheck: function (json, i, selected) {
        if (json.letters[i] === 1) {
            var audio = new Audio("./audio/letter1.mp3");
            audio.play();
            $(selected).addClass("lingo-letter-yellow");
        } else if (json.letters[i] === 2) {
            var audio = new Audio("./audio/letter2.mp3");
            audio.play();
            $(selected).addClass("lingo-letter-red");
        } else {
            var audio = new Audio("./audio/letter0.mp3");
            audio.play();
        }
    },

    nextGuess: function () {
        var index = $(".lingo-current").index(); //Current row index
        if(index !== -1){ //Check first guess (initializer)
            $('.lingo-current > td > div > div').removeAttr("contenteditable").removeAttr("tabindex"); //Disable focus and editing

            $('.lingo-current > td > div > div').each(function (i, selected) { //Add right letters to right letters array so they appear automatically next guess
                if ($(selected).parent().hasClass("lingo-letter-red")) {
                    Lingo.rightLetters[i] = $(selected).html().trim().toUpperCase();
                }
            });
            $(".lingo-current").removeClass("lingo-current"); //Remove current row
        }
        if(index + 1 < $(".lingo > tbody > tr").length) { //If not the last row
            index = index + 1;
            $('.lingo > tbody > tr').eq(index).addClass("lingo-current"); //Make current
            $('.lingo-current > td > div > div').prop("contenteditable", false).prop("tabindex", 0).attr("autocomplete", "off").prop("spellcheck", false).attr("autocorrect", "off").html(".");
            $('.lingo-current > td > div > div').each(function(i, selected){ //Set right letters
                 if(Lingo.rightLetters[i] !== undefined && Lingo.rightLetters[i] !== null) {
                     $(selected).html(Lingo.rightLetters[i]);
                 } else {
                     $(selected).html(".");
                 }
            });
            if(Lingo.mobile) {
                $("div[contenteditable=false]").prop("contenteditable", true);
                $('.lingo-current > td > div > div').eq(0).blur(); //Make sure keyboard pops up
            }
            $('.lingo-current > td > div > div').eq(0).trigger("click"); //Focus first letter

            Lingo.enterPressed = false; //Enable enter again
            Lingo.startTimer();
        } else {
            Lingo.nextWord(false); //Game over
        }
    },

    stopTimer: function () {
        $(".lingo-progress-bar").stop();
        $(".lingo-progress-bar").css("width", "0px");
    },

    startTimer: function () {
        Lingo.stopTimer();

        if(parseInt(Lingo.time) !== 0) {
            $(".lingo-progress-bar").animate({
                width: "100%"
            }, Lingo.time * 1000, "linear", function () {
                Lingo.enterPressed = true;
                var audio = new Audio("./audio/timeup.mp3");
                audio.play();

                // Timeout - treat as wrong guess and switch teams
                setTimeout(function() {
                    Lingo.handleTimeout();
                }, 100);
            });
        }
    },

    handleTimeout: function() {
        // Timeout adds a hint letter, stays on same row, switches teams
        $.ajax({
            url: API_URL + "api/check",
            type: "POST",
            data: { word: "", language: Lingo.language, timeout: "true" },
            xhrFields: { withCredentials: true },
            success: function (data) {
                var json = JSON.parse(data);

                // Update aid letters (timeout adds a hint)
                if(json.newAidLetters) {
                    Lingo.rightLetters = json.newAidLetters;
                    Lingo.startLetters = json.newAidLetters;
                }

                // Switch teams
                if(json.teamSwitch) {
                    Lingo.currentTeam = json.currentTeam;
                    Lingo.updateScoreDisplay();

                    var previousTeam = (json.currentTeam === 1) ? Lingo.team2Name : Lingo.team1Name;
                    var currentTeam = (json.currentTeam === 1) ? Lingo.team1Name : Lingo.team2Name;
                    alert(previousTeam + " timed out. " + currentTeam + "'s turn!");
                }

                // Clear current row and repopulate with updated aid letters
                Lingo.resetCurrentRow();
            }
        });
    },

    resetCurrentRow: function() {
        // Clear and repopulate the current row with updated aid letters
        $('.lingo-current > td > div > div').each(function(i, selected){
            if(Lingo.rightLetters[i] !== undefined && Lingo.rightLetters[i] !== null) {
                $(selected).html(Lingo.rightLetters[i]);
            } else {
                $(selected).html(".");
            }
        });

        // Focus first editable letter
        $('.lingo-current > td > div > div').eq(0).trigger("click");

        // Restart the timer
        Lingo.enterPressed = false;
        Lingo.startTimer();
    },


    activateVoice: function () {
        if(annyang) {
            if (Lingo.language === "nl") {
                annyang.setLanguage("nl-NL");
            } else if (Lingo.language === "de") {
                annyang.setLanguage("de-DE");
            }
            // Add our commands to annyang
            annyang.addCommands({
                "help": function () {
                    console.log("HELP");
                }
            });
            annyang.debug(true);

            annyang.addCallback("result", function (e) {
                for (var i = 0; i < 5; i++) {
                    if (typeof e[i] !== "undefined") {
                        e[i] = e[i].replace("lange ij", "|");
                        var wordArray = e[i].split(" ").slice(parseInt(Lingo.letters) * -1); //Get the last x single letters
                        console.log(wordArray);
                        var success = true;
                        if (wordArray.length === parseInt(Lingo.letters)) {
                            for (var j = 0; j < parseInt(Lingo.letters); j++) {
                                if (wordArray[j].length !== 1) {
                                    success = false;
                                }
                            }
                        } else {
                            success = false;
                        }
                        if (success) {
                            //var actualWord = wordArray[(parseInt(Lingo.letters) * -1) - 1];
                            $('.lingo-current > td > div > div').each(function (k, selected) {
                                $(selected).html((wordArray[k].toUpperCase() === "|" ? "IJ" : wordArray[k].toUpperCase()));
                            });
                            Lingo.enterPressed = true;
                            Lingo.check();
                            break;
                        }
                    }
                }
                console.log(e);
            });
            // Start listening.
            annyang.start();
        } else {
            alert("Voice control not available. Only works on Google Chrome.");
        }
    },
};

function getDifference(a, b)
{
    var i = 0;
    var j = 0;
    var result = "";

    while (j < b.length)
    {
        if (a[i] !== b[j] || i === a.length)
            result += b[j];
        else
            i++;
        j++;
    }
    return result;
}
