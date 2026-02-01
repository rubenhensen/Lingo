function submitForm() {
    Lingo.language = $("input[name=language]:checked").val();
    Lingo.time = parseInt($("input[name=time]").val()) || 30; // Read from form input
    Lingo.letters = 5; // Start with 5 letters (Round 1)
    Lingo.tries = 6; // 5 tries for team 1, 1 for team 2

    // Get team names
    Lingo.team1Name = $("input[name=team1name]").val().trim() || "Team 1";
    Lingo.team2Name = $("input[name=team2name]").val().trim() || "Team 2";

    if($("input[name=voice]").is(":checked")) {
        Lingo.activateVoice();
    }

    // Initialize team game
    $.ajax({
        url: API_URL + "api/init-team-game",
        type: "POST",
        data: {language: Lingo.language},
        xhrFields: { withCredentials: true },
        success: function (data) {
            var json = JSON.parse(data);

            Lingo.rightLetters = json.aidLetters;
            Lingo.startLetters = json.aidLetters;
            Lingo.team1Score = 0;
            Lingo.team2Score = 0;
            Lingo.currentTeam = 1;
            Lingo.currentTry = 1;
            Lingo.round = 1;

            // Update team name displays
            $(".team1-name").html(Lingo.team1Name);
            $(".team2-name").html(Lingo.team2Name);

            // Initialize bingo grids
            Bingo.init(json.team1Grid, json.team2Grid, json.team1Filled, json.team2Filled);

            $("#menu").hide();
            $("#overlay").hide();
            $("#game").show();
            Lingo.init();
        }
    });
}

function updateLanguage() {
    var lang = $("input[name=language]:checked").val();
    document.l10n.requestLanguages([lang]);
    if(lang === "en" || lang === "de") {
        $("input[name=letters][value='7']").prop("disabled", true);
        $("input[name=letters][value='8']").prop("disabled", true);
        $("input[name=letters][value='10']").prop("disabled", true);
        if(parseInt($("input[name=letters]:checked").val()) >= 7) {
            $("input[name=letters][value='6']").prop("checked", true);
        }
    } else {
        $("input[name=letters][value='7']").prop("disabled", false);
        $("input[name=letters][value='8']").prop("disabled", false);
        $("input[name=letters][value='10']").prop("disabled", false);
    }
}

$("input[name=language]").click(function () {
    updateLanguage();
});

$("input").change(function () {
    localStorage.setItem("language", $("input[name=language]:checked").val());
    localStorage.setItem("time", $("input[name=time]").val());
    localStorage.setItem("voice", $("input[name=voice]").is(":checked").toString());
    localStorage.setItem("team1name", $("input[name=team1name]").val());
    localStorage.setItem("team2name", $("input[name=team2name]").val());
});

/*
$("input[name=aidLettersCustom]").change(function () {
    $("input[name=aidLetters]:last").prop("checked", true).val($("input[name=aidLettersCustom]").val());
});
*/

function showMenu() {
    $("#menu").show();
    $("#overlay").hide();
    $("#game").hide();
}

$(document).ready(function () {
    // Enable credentials for all AJAX requests
    $.ajaxSetup({
        xhrFields: {
            withCredentials: true
        }
    });

    if(localStorage.getItem("language") !== null) {
        document.l10n.requestLanguages([localStorage.getItem("language")]);
        $("input[name=language][value=" + localStorage.getItem("language") + "]").prop("checked", true);
    }
    if(localStorage.getItem("time") !== null) $("input[name=time]").val(localStorage.getItem("time"));
    if(localStorage.getItem("team1name") !== null) $("input[name=team1name]").val(localStorage.getItem("team1name"));
    if(localStorage.getItem("team2name") !== null) $("input[name=team2name]").val(localStorage.getItem("team2name"));
    // if(localStorage.getItem("voice") !== null) $("input[name=voice]").prop("checked", localStorage.getItem("voice") === "true");

    updateLanguage();

    $(".splashscreen").fadeOut();

    $("input[name=voice]").change(function () {
        if ($("input[name=voice]").is(":checked")) {
            Lingo.activateVoice();
        } else {
            if (annyang) {
                annyang.abort();
            }
        }
    });
});