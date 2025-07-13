import { useEffect, useRef, useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { base } from "viem/chains";
import { Button } from "@/components/ui/button";

interface SnakeSegment {
  x: number;
  y: number;
}

const GRID_SIZE = 20;
const TILE_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

export default function SnakeGame() {
  const { setFrameReady, isFrameReady, sendFrameInteraction } = useMiniKit();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<SnakeSegment[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState("RIGHT");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Set frame ready for Farcaster
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Initialize game loop
  useEffect(() => {
    if (gameOver) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const gameLoop = setInterval(() => {
      moveSnake();
      drawGame(ctx);
    }, 100);

    return () => clearInterval(gameLoop);
  }, [snake, direction, gameOver]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          if (direction !== "DOWN") setDirection("UP");
          break;
        case "ArrowDown":
          if (direction !== "UP") setDirection("DOWN");
          break;
        case "ArrowLeft":
          if (direction !== "RIGHT") setDirection("LEFT");
          break;
        case "ArrowRight":
          if (direction !== "LEFT") setDirection("RIGHT");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction]);

  // Move snake
  const moveSnake = () => {
    const newSnake = [...snake];
    const head = { ...newSnake[0] };

    switch (direction) {
      case "UP":
        head.y -= 1;
        break;
      case "DOWN":
        head.y += 1;
        break;
      case "LEFT":
        head.x -= 1;
        break;
      case "RIGHT":
        head.x += 1;
        break;
    }

    // Check collisions
    if (
      head.x < 0 ||
      head.x >= GRID_SIZE ||
      head.y < 0 ||
      head.y >= GRID_SIZE ||
      newSnake.some((segment) => segment.x === head.x && segment.y === head.y)
    ) {
      setGameOver(true);
      return;
    }

    newSnake.unshift(head);

    // Check food collision
    if (head.x === food.x && head.y === food.y) {
      setScore(score + 10);
      setFood({
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      });
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  };

  // Draw game
  const drawGame = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#1a1a1a"; // Dark background
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw snake
    ctx.fillStyle = "#00ff00"; // Neon green
    snake.forEach((segment) => {
      ctx.fillRect(
        segment.x * TILE_SIZE,
        segment.y * TILE_SIZE,
        TILE_SIZE - 2,
        TILE_SIZE - 2
      );
    });

    // Draw food
    ctx.fillStyle = "#ff00ff"; // Neon pink
    ctx.fillRect(food.x * TILE_SIZE, food.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
  };

  // Share score on Farcaster
  const handleShareScore = async () => {
    setIsLoading(true);
    try {
      await sendFrameInteraction({
        action: "post",
        content: `I scored ${score} in Farcaster Snake Run! 🐍 Play now!`,
        target: "https://farcaster-snake-run.vercel.app",
      });
      alert("Score shared on Farcaster!");
    } catch (error) {
      console.error("Error sharing score:", error);
      alert("Failed to share score. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Restart game
  const handleRestart = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 15 });
    setDirection("RIGHT");
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Farcaster Snake Run</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border-2 border-neon-green"
      />
      <div className="mt-4 text-lg">Score: {score}</div>
      {gameOver && (
        <div className="mt-4 text-red-500 text-lg">Game Over! Final Score: {score}</div>
      )}
      <div className="mt-4 flex gap-4">
        <Button
          onClick={handleRestart}
          disabled={isLoading}
          className="bg-neon-green text-black hover:bg-neon-green/80"
        >
          {gameOver ? "Restart" : "New Game"}
        </Button>
        <Button
          onClick={handleShareScore}
          disabled={isLoading || score === 0}
          className="bg-neon-pink text-black hover:bg-neon-pink/80"
        >
          {isLoading ? "Sharing..." : "Share Score"}
        </Button>
      </div>
    </div>
  );
}