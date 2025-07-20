import { Scene } from "phaser";
import { createNoise2D } from "simplex-noise";

export class Game extends Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.cameras.main.setBackgroundColor(0xffffff);

    const width = 1024;
    const height = 768;
    const scale = 7; // Try values like 0.5, 1, 5, 10

    const canvas = this.textures.createCanvas("noiseCanvas", width, height);
    const ctx = canvas.getContext();

    this.simplex = createNoise2D();

    let mapArray = [];
    let waterLevel = 0.24;
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const nx = (x / width) * scale;
        const ny = (y / height) * scale;

        let value = fractalNoise2D(this.simplex, nx, ny, 5, 0.5, 2.0);
        let normalized = (value + 1) / 2;

        // Apply edge falloff
        const falloff = edgeFalloff(x, y, width, height, 3); // Power controls steepness
        normalized *= 1 - falloff; // Less land at edges

        // Optional: sharpen
        normalized = Math.pow(normalized, 1.8);

        row[x] = normalized;
        // Coloring
      }
      mapArray[y] = row;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const normalized = mapArray[y][x];

        if (normalized >= waterLevel) {
          if (getAdjacent(mapArray, x, y)) {
            ctx.fillStyle = `rgba(14, 14, 14, 1)`;
          } else if (normalized < 0.45) {
            ctx.fillStyle = `rgba(0, 187, 0, 1)`; // land
          } else if (normalized < 0.6) {
            ctx.fillStyle = `rgba(13, 73, 13, 1)`; // forest
          } else {
            ctx.fillStyle = `rgb(200, 255, 200)`; // hills
          }
        } else if (normalized < 0.3) {
          ctx.fillStyle = `rgb(0, 0, 255)`; // water
        }

        ctx.fillRect(x, y, 1, 1);
      }
    }
    canvas.refresh();
    
    this.add.image(width, height, "noiseCanvas").setOrigin(1);

    function fractalNoise2D(
      noise2D,
      x,
      y,
      octaves = 4,
      persistence = 0.5,
      lacunarity = 2.0
    ) {
      let total = 0;
      let frequency = 1;
      let amplitude = 1;
      let maxValue = 0;

      for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }

      return total / maxValue; // Normalize to [-1, 1]
    }

    function edgeFalloff(x, y, width, height, edgePower = 3) {
      const dx = (x / width - 0.5) * 1.4;
      const dy = (y / height - 0.5) * 1.2;
      const distance = Math.sqrt(dx * dx + dy * dy); // 0 (center) to ~1.41 (corners)
      const norm = Math.min(distance / 1.0, 1); // Clamp to [0, 1]
      return Math.pow(norm, edgePower); // 0 in center, ~1 at corners
    }

    function isValidPos(i, j, n, m) {
      if (i < 0 || j < 0 || i >= n || j >= m) return 0;
      return 1;
    }

    // Function that returns all adjacent elements
    function getAdjacent(arr, x, y) {
      const height = arr.length;
      const width = arr[0].length;
      const dirs = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ];

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && ny < height && nx < width) {
          if (arr[ny][nx] < waterLevel) {
            // Correct indexing: row [y], column [x]
            return true;
          }
        }
      }

      return false;
    }
  }
}
