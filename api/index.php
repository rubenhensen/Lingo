<?php
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Views\PhpRenderer;

session_start();

require_once "./includes.php";
// Create and configure Slim app
$app = new \Slim\App(["settings" => [
    "displayErrorDetails" => true,
    "addContentLengthHeader" => false,
]]);

$container = $app->getContainer();

$container["renderer"] = new PhpRenderer("../templates");

// Add CORS middleware
$app->add(function ($request, $response, $next) {
    // Get the origin from the request
    $origin = $request->getHeaderLine('Origin');

    // If no origin, try to get it from referer
    if (empty($origin)) {
        $origin = '*';
    }

    $response = $next($request, $response);
    return $response
        ->withHeader('Access-Control-Allow-Origin', $origin)
        ->withHeader('Access-Control-Allow-Credentials', 'true')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// Handle OPTIONS preflight requests
$app->options('/{routes:.+}', function ($request, $response, $args) {
    $origin = $request->getHeaderLine('Origin');
    if (empty($origin)) {
        $origin = '*';
    }

    return $response
        ->withHeader('Access-Control-Allow-Origin', $origin)
        ->withHeader('Access-Control-Allow-Credentials', 'true')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        ->withStatus(200);
});

/*
$container["notFoundHandler"] = function ($container) {
    return function (ServerRequestInterface $request, ResponseInterface $response) use ($container) {
        $container['response']->withStatus(404);
        $response = $container->view->render($response, $request->getAttribute("language") . "/404", [
            "language" => $request->getAttribute("language"),
            "page" => ltrim($request->getUri()->getPath())
        ]);
        $response = $response->withStatus(404);
        return $response;
    };
};
*/

/*
$app->get("/", \Controllers\LingoController::class . ":view");

$app->get("/multiplayer", function (ServerRequestInterface $request, ResponseInterface $response, $args) {
    return $this->renderer->render($response, "/multiplayer.php", [
        "language" => $request->getAttribute("language"),
        "page" => ltrim($request->getUri()->getPath())
    ]);
});
$app->get("/start", function (ServerRequestInterface $request, ResponseInterface $response, $args) {
    return $this->renderer->render($response, "/start.php", [
        "language" => $request->getAttribute("language"),
        "page" => ltrim($request->getUri()->getPath())
    ]);
});
$app->get("/game", function (ServerRequestInterface $request, ResponseInterface $response, $args) {
    return $this->renderer->render($response, "/game.php", [
        "language" => $request->getAttribute("language"),
        "page" => ltrim($request->getUri()->getPath())
    ]);
});
$app->get("/login", function (ServerRequestInterface $request, ResponseInterface $response, $args) {
    return $this->renderer->render($response, "/login.php", [
        "language" => $request->getAttribute("language"),
        "page" => ltrim($request->getUri()->getPath())
    ]);
});
*/

$app->post("/api/check", \Controllers\LingoController::class . ":check");
$app->post("/api/init", \Controllers\LingoController::class . ":init");
$app->post("/api/right", \Controllers\LingoController::class . ":right");
$app->post("/api/init-team-game", \Controllers\LingoController::class . ":initTeamGame");
$app->post("/api/next-word", \Controllers\LingoController::class . ":nextWord");
$app->post("/api/submit-number", \Controllers\LingoController::class . ":submitNumber");
$app->post("/api/init-bonus", \Controllers\LingoController::class . ":initBonus");

// Run app
$app->run();
