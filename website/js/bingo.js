var Bingo = {
    team1Grid: [],
    team2Grid: [],
    team1Filled: [],
    team2Filled: [],
    team1CompletedLines: [],
    team2CompletedLines: [],

    /**
     * Initialize bingo grids
     */
    init: function(team1Grid, team2Grid, team1Filled, team2Filled) {
        Bingo.team1Grid = team1Grid;
        Bingo.team2Grid = team2Grid;
        Bingo.team1Filled = team1Filled;
        Bingo.team2Filled = team2Filled;
        Bingo.team1CompletedLines = [];
        Bingo.team2CompletedLines = [];

        Bingo.renderGrid(1);
        Bingo.renderGrid(2);
    },

    /**
     * Render a bingo grid
     */
    renderGrid: function(teamNumber) {
        var grid = (teamNumber === 1) ? Bingo.team1Grid : Bingo.team2Grid;
        var filled = (teamNumber === 1) ? Bingo.team1Filled : Bingo.team2Filled;
        var container = $("#team" + teamNumber + "-bingo");

        container.html("");

        var table = $("<table class='bingo-grid'></table>");

        for(var row = 0; row < 5; row++) {
            var tr = $("<tr></tr>");
            for(var col = 0; col < 5; col++) {
                var number = grid[row][col];
                var td = $("<td data-row='" + row + "' data-col='" + col + "'>" + number + "</td>");

                // Check if this position is pre-filled
                var isFilled = false;
                for(var i = 0; i < filled.length; i++) {
                    if(filled[i][0] === row && filled[i][1] === col) {
                        isFilled = true;
                        break;
                    }
                }

                if(isFilled) {
                    td.addClass("filled");
                }

                tr.append(td);
            }
            table.append(tr);
        }

        container.append(table);
    },

    /**
     * Show number entry modal
     */
    showNumberEntry: function(teamNumber, callback) {
        $("#number-entry-modal").show();
        var teamName = (teamNumber === 1) ? Lingo.team1Name : Lingo.team2Name;
        $("#number-entry-team").html(teamName);
        $("#number-input").val("").focus();

        $("#number-entry-submit").off("click").on("click", function() {
            var number = parseInt($("#number-input").val());

            if(isNaN(number) || number < 1 || number > 25) {
                alert("Please enter a valid number between 1 and 25");
                return;
            }

            // Check if this number is already filled on this team's grid
            var grid = (teamNumber === 1) ? Bingo.team1Grid : Bingo.team2Grid;
            var filled = (teamNumber === 1) ? Bingo.team1Filled : Bingo.team2Filled;

            // Find if this number is already marked
            var alreadyFilled = false;
            for(var i = 0; i < filled.length; i++) {
                var row = filled[i][0];
                var col = filled[i][1];
                if(grid[row][col] === number) {
                    alreadyFilled = true;
                    break;
                }
            }

            if(alreadyFilled) {
                alert("Number " + number + " is already marked on the grid. Please choose a different number.");
                return;
            }

            $("#number-entry-modal").hide();
            callback(number);
        });

        // Allow Enter key to submit
        $("#number-input").off("keypress").on("keypress", function(e) {
            if(e.which === 13) {
                $("#number-entry-submit").click();
            }
        });
    },

    /**
     * Mark a number on the grid
     */
    markNumber: function(teamNumber, number) {
        var grid = (teamNumber === 1) ? Bingo.team1Grid : Bingo.team2Grid;
        var filled = (teamNumber === 1) ? Bingo.team1Filled : Bingo.team2Filled;

        // Find the position of this number on the grid
        var foundRow = -1, foundCol = -1;
        for(var row = 0; row < 5; row++) {
            for(var col = 0; col < 5; col++) {
                if(grid[row][col] === number) {
                    foundRow = row;
                    foundCol = col;
                    break;
                }
            }
            if(foundRow !== -1) break;
        }

        if(foundRow === -1) {
            alert("Number " + number + " not found on Team " + teamNumber + "'s grid!");
            return false;
        }

        // Check if already filled
        for(var i = 0; i < filled.length; i++) {
            if(filled[i][0] === foundRow && filled[i][1] === foundCol) {
                alert("This number is already marked!");
                return false;
            }
        }

        // Mark it as filled
        filled.push([foundRow, foundCol]);

        // Update the visual display
        $("#team" + teamNumber + "-bingo td[data-row='" + foundRow + "'][data-col='" + foundCol + "']")
            .addClass("filled");

        // Save back to team arrays
        if(teamNumber === 1) {
            Bingo.team1Filled = filled;
        } else {
            Bingo.team2Filled = filled;
        }

        return true;
    },

    /**
     * Check for Lingo (complete row, column, or diagonal)
     */
    checkLingo: function(teamNumber) {
        var filled = (teamNumber === 1) ? Bingo.team1Filled : Bingo.team2Filled;
        var completedLines = (teamNumber === 1) ? Bingo.team1CompletedLines : Bingo.team2CompletedLines;

        // Create a 5x5 boolean array for easier checking
        var filledMap = [];
        for(var i = 0; i < 5; i++) {
            filledMap[i] = [false, false, false, false, false];
        }
        for(var i = 0; i < filled.length; i++) {
            filledMap[filled[i][0]][filled[i][1]] = true;
        }

        var newLines = [];

        // Check rows
        for(var row = 0; row < 5; row++) {
            var complete = true;
            for(var col = 0; col < 5; col++) {
                if(!filledMap[row][col]) {
                    complete = false;
                    break;
                }
            }
            if(complete) {
                var lineId = "row-" + row;
                if(completedLines.indexOf(lineId) === -1) {
                    newLines.push(lineId);
                    completedLines.push(lineId);
                }
            }
        }

        // Check columns
        for(var col = 0; col < 5; col++) {
            var complete = true;
            for(var row = 0; row < 5; row++) {
                if(!filledMap[row][col]) {
                    complete = false;
                    break;
                }
            }
            if(complete) {
                var lineId = "col-" + col;
                if(completedLines.indexOf(lineId) === -1) {
                    newLines.push(lineId);
                    completedLines.push(lineId);
                }
            }
        }

        // Check diagonal (top-left to bottom-right)
        var complete = true;
        for(var i = 0; i < 5; i++) {
            if(!filledMap[i][i]) {
                complete = false;
                break;
            }
        }
        if(complete) {
            var lineId = "diag-1";
            if(completedLines.indexOf(lineId) === -1) {
                newLines.push(lineId);
                completedLines.push(lineId);
            }
        }

        // Check diagonal (top-right to bottom-left)
        complete = true;
        for(var i = 0; i < 5; i++) {
            if(!filledMap[i][4 - i]) {
                complete = false;
                break;
            }
        }
        if(complete) {
            var lineId = "diag-2";
            if(completedLines.indexOf(lineId) === -1) {
                newLines.push(lineId);
                completedLines.push(lineId);
            }
        }

        // Save back completed lines
        if(teamNumber === 1) {
            Bingo.team1CompletedLines = completedLines;
        } else {
            Bingo.team2CompletedLines = completedLines;
        }

        return newLines.length > 0;
    },

    /**
     * Highlight completed lines
     */
    highlightLines: function(teamNumber) {
        var completedLines = (teamNumber === 1) ? Bingo.team1CompletedLines : Bingo.team2CompletedLines;
        var container = $("#team" + teamNumber + "-bingo");

        // Add highlighting class to completed lines
        for(var i = 0; i < completedLines.length; i++) {
            var lineId = completedLines[i];
            var parts = lineId.split("-");
            var type = parts[0];
            var index = parseInt(parts[1]);

            if(type === "row") {
                container.find("tr").eq(index).find("td").addClass("lingo-line");
            } else if(type === "col") {
                for(var row = 0; row < 5; row++) {
                    container.find("tr").eq(row).find("td").eq(index).addClass("lingo-line");
                }
            } else if(type === "diag" && index === 1) {
                for(var i = 0; i < 5; i++) {
                    container.find("tr").eq(i).find("td").eq(i).addClass("lingo-line");
                }
            } else if(type === "diag" && index === 2) {
                for(var i = 0; i < 5; i++) {
                    container.find("tr").eq(i).find("td").eq(4 - i).addClass("lingo-line");
                }
            }
        }
    }
};
