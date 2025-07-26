import { Scene } from "phaser";
import { createNoise2D } from "simplex-noise";
import { Country } from "../objects/Country.js";

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
    let waterLevel = 0.2;
    this.claimed = new Set();

    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const nx = (x / width) * scale;
        const ny = (y / height) * scale;

        let value = fractalNoise2D(this.simplex, nx, ny, 5, 0.5, 2.0);
        let normalized = (value + 1) / 2;

        // Apply edge falloff
        const falloff = edgeFalloff(x, y, width, height, 2); // Power controls steepness
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
          } else if (normalized < 0.23) {
            ctx.fillStyle = `rgba(127, 228, 12, 1)`; // sand
          } else if (normalized < 0.45) {
            ctx.fillStyle = `rgba(0, 187, 0, 1)`; // land
          } else if (normalized < 0.6) {
            ctx.fillStyle = `rgba(13, 73, 13, 1)`; // forest
          } else {
            ctx.fillStyle = `rgb(200, 255, 200)`; // hills
          }
        } else {
          ctx.fillStyle = `rgb(0, 0, 255)`; // water
        }

        ctx.fillRect(x, y, 1, 1);
      }
    }
    canvas.refresh();

    this.add.image(width, height, "noiseCanvas").setOrigin(1);

    this.countries = [];

    this.input.on("pointermove", (pointer) => {
      const x = Math.floor(pointer.x);
      const y = Math.floor(pointer.y);

      if (x >= 0 && x < mapArray[0].length && y >= 0 && y < mapArray.length) {
        console.log(x, y, mapArray[y][x]);
      }
    });

    this.input.on("pointerdown", (pointer) => {
      const x = Math.floor(pointer.x);
      const y = Math.floor(pointer.y);
      const key = `${x},${y}`;

      for (const country of this.countries) {
        //country.seafaringLevel -= 0.1;
        console.log(country.seafaringLevel);
      }

      // Check if the location is over land and not already claimed
      if (
        x >= 0 &&
        x < mapArray[0].length &&
        y >= 0 &&
        y < mapArray.length &&
        mapArray[y][x] >= waterLevel &&
        !this.claimed.has(key)
      ) {
        const color = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
          Math.random() * 255
        )}, ${Math.floor(Math.random() * 255)}, 0.73)`;

        const newCountry = new Country(
          this,
          x,
          y,
          canvas,
          mapArray,
          waterLevel,
          color,
          this.claimed
        );

        this.countries.push(newCountry);
      }
    });

    // Functions
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
  update(time, delta) {
    for (const country of this.countries) {
      country.update(time, delta);
    }
  }
}
