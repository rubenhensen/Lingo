<?php
// Suppress deprecation warnings for Slim 3 on newer PHP versions
error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
ini_set('display_errors', getenv('PHP_DISPLAY_ERRORS') ?: '0');

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Views\PhpRenderer;

// Configure session (same-site since frontend and API are on same domain)
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');

session_start();

require_once __DIR__ . "/includes.php";
// Create and configure Slim app
$app = new \Slim\App(["settings" => [
    "displayErrorDetails" => true,
    "addContentLengthHeader" => false,
]]);

$container = $app->getContainer();

$container["renderer"] = new PhpRenderer("../templates");

// Add CORS headers to all responses, including errors
$container['errorHandler'] = function ($container) {
    return function ($request, $response, $exception) use ($container) {
        $origin = $request->getHeaderLine('Origin');

        // In dev mode, allow all origins
        if (getenv('CORS_ALLOW_ALL') === 'true') {
            $allowOrigin = $origin ?: '*';
        } else {
            $allowedOrigins = [
                'http://localhost:8001',
                'https://lingo.hensen.io',
                'http://lingo.hensen.io'
            ];
            $allowOrigin = in_array($origin, $allowedOrigins) ? $origin : '*';
        }

        return $response
            ->withStatus(500)
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
            ->withHeader('Access-Control-Allow-Credentials', 'true')
            ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization, Content-Length')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
            ->getBody()->write(json_encode([
                'error' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine()
            ]));
    };
};

$container['phpErrorHandler'] = function ($container) {
    return $container['errorHandler'];
};

// Add CORS middleware
$app->add(function ($request, $response, $next) {
    $origin = $request->getHeaderLine('Origin');

    // In dev mode (CORS_ALLOW_ALL=true), allow all origins
    if (getenv('CORS_ALLOW_ALL') === 'true') {
        $allowOrigin = $origin ?: '*';
    } else {
        // Allow localhost for development and your domain for production
        $allowedOrigins = [
            'http://localhost:8001',
            'https://lingo.hensen.io',
            'http://lingo.hensen.io'
        ];

        // Since frontend and API are on same domain at lingo.hensen.io,
        // allow the requesting origin if it's in our whitelist
        $allowOrigin = in_array($origin, $allowedOrigins) ? $origin : '*';
    }

    $response = $next($request, $response);
    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
        ->withHeader('Access-Control-Allow-Credentials', 'true')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization, Content-Length')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// Handle OPTIONS preflight requests
$app->options('/{routes:.+}', function ($request, $response, $args) {
    $origin = $request->getHeaderLine('Origin');

    // In dev mode (CORS_ALLOW_ALL=true), allow all origins
    if (getenv('CORS_ALLOW_ALL') === 'true') {
        $allowOrigin = $origin ?: '*';
    } else {
        $allowedOrigins = [
            'http://localhost:8001',
            'https://lingo.hensen.io',
            'http://lingo.hensen.io'
        ];

        $allowOrigin = in_array($origin, $allowedOrigins) ? $origin : '*';
    }

    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
        ->withHeader('Access-Control-Allow-Credentials', 'true')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization, Content-Length')
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

// Test endpoint
$app->get("/api/ping", function ($request, $response, $args) {
    return $response->getBody()->write(json_encode(["status" => "ok", "message" => "API is running"]));
});

$app->post("/api/check", \Controllers\LingoController::class . ":check");
$app->post("/api/init", \Controllers\LingoController::class . ":init");
$app->post("/api/right", \Controllers\LingoController::class . ":right");
$app->post("/api/init-team-game", \Controllers\LingoController::class . ":initTeamGame");
$app->post("/api/next-word", \Controllers\LingoController::class . ":nextWord");
$app->post("/api/submit-number", \Controllers\LingoController::class . ":submitNumber");
$app->post("/api/init-bonus", \Controllers\LingoController::class . ":initBonus");

// Run app
$app->run();
