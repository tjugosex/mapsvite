export class Country {
  constructor(scene, x, y, canvas, mapArray, waterLevel, color, claimed) {
    this.scene = scene;
    this.canvas = canvas;
    this.mapArray = mapArray;
    this.waterLevel = waterLevel;
    this.ctx = canvas.getContext();
    this.color = color;
    this.claimed = claimed;

    this.width = mapArray[0].length;
    this.height = mapArray.length;

    this.area = new Set(); // Set of "x,y" strings
    this.border = new Set(); // Current edge pixels

    // Start with the initial pixel
    const key = `${x},${y}`;
    this.area.add(key);
    this.border.add(key);
    this.drawPixel(x, y);

    this.elapsed = 0;
    this.updateInterval = 50;

    this.pixelElapsed = 0;
    this.pixelUpdateInterval = 27;

    this.originX = x;
    this.originY = y;

    this.currentRadius = 0;
    this.radiusStep = 1;

    this.pixelTimers = new Map();

    this.delayK = 1.3;

    this.seafaringLevel = 1;
  }

  update(time, delta) {
    this.elapsed += delta;
    if (this.elapsed < this.updateInterval) return;
    this.elapsed = 0;

    const nextBorder = new Set();

    for (const pos of this.border) {
      const [x, y] = pos.split(",").map(Number);
      const neighbors = this.getNeighbors(x, y);

      for (let i = 0; i < neighbors.length; i++) {
        const [nx, ny] = neighbors[i];
        const key = `${nx},${ny},${this}`;

        if (
          nx >= 0 &&
          nx < this.width &&
          ny >= 0 &&
          ny < this.height &&
          !this.claimed.has(key) &&
          !this.area.has(key)
        ) {
          if (this.mapArray[ny][nx] >= this.waterLevel) {
            let delay;
            let normalized = this.mapArray[ny][nx];
            if (this.area.size < 30) {
              delay = 1;
            } else {
              delay = this.pixelUpdateInterval * normalized * this.delayK;
            }

            const pixelTime = this.pixelTimers.get(key) || 0;
            const newTime = pixelTime + delta;

            if (newTime >= delay) {
              this.pixelTimers.delete(key); // Clear the timer
              this.waitFunction(time, delta, nextBorder, key, nx, ny);
            } else {
              this.pixelTimers.set(key, newTime);
            }
          }
        } else if (this.getAdjacent(this.mapArray, nx, ny)) {
          this.ctx.fillStyle = `rgba(0, 0, 0, 1)`;
          this.ctx.fillRect(nx, ny, 1, 1);
        }
      }
    }

    this.border = nextBorder;
    if (nextBorder.size > 0) {
      this.canvas.refresh();
    }
  }

  waitFunction(time, delta, nextBorder, key, nx, ny) {
    this.area.add(key);
    this.claimed.add(key);
    nextBorder.add(key);
    this.drawPixel(nx, ny);
  }

  drawPixel(x, y) {
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(x, y, 1, 1);
  }

  getNeighbors(x, y) {
    const dirs = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
      [x + 1, y + 1],
      [x - 1, y - 1],
      [x + 1, y - 1],
      [x - 1, y + 1],
    ];

    return dirs;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  createN(n) {
    return [...Array(n).keys()];
  }
  getAdjacent(arr, x, y) {
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
      const key = `${nx},${ny}`;
      if (nx >= 0 && ny >= 0 && ny < height && nx < width) {

        if(this.mapArray[ny][nx] < this.waterLevel){
          return true;
        }


        if (this.claimed.has(key) && !this.area.has(key)) {
          return true; // Adjacent to another country
        }
      }
    }

    return false;
  }
}
