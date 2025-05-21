import { Point, ViewportState } from "./types";

export function getSpectralColor(value: number, theme?: any): string {
  // Using color transitions from theme colors if available
  const lowColor = theme?.colors?.geneTerrain?.primary || "#1E6B52";
  const midColor = theme?.colors?.geneTerrain?.neutral || "#606060";
  const highColor = theme?.colors?.geneTerrain?.accent1 || "#80BC00";

  // If theme is provided, use it to generate the color
  if (theme) {
    // Create gradient between theme colors
    if (value < 0.33) {
      return blendColors(lowColor, midColor, value * 3);
    } else if (value < 0.66) {
      return blendColors(midColor, highColor, (value - 0.33) * 3);
    } else {
      return highColor;
    }
  }

  // Fallback to original implementation
  if (value < 0.2) {
    return `rgb(0, 0, ${Math.floor(255 * (value / 0.2))})`;
  } else if (value < 0.4) {
    const t = (value - 0.2) / 0.2;
    return `rgb(0, ${Math.floor(255 * t)}, 255)`;
  } else if (value < 0.6) {
    const t = (value - 0.4) / 0.2;
    return `rgb(0, 255, ${Math.floor(255 * (1 - t))})`;
  } else if (value < 0.8) {
    const t = (value - 0.6) / 0.2;
    return `rgb(${Math.floor(255 * t)}, 255, 0)`;
  } else {
    const t = (value - 0.8) / 0.2;
    return `rgb(255, ${Math.floor(255 * (1 - t))}, 0)`;
  }
}

// Add a color blending function
function blendColors(color1: string, color2: string, ratio: number): string {
  // Implementation of color blending
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

interface ContourPlotOptions {
  gridSize?: number;
  levels?: number[];
  lineWidth?: number;
  lineColor?: string;
  fillOpacity?: number;
}

export class ContourPlot {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private readonly options: Required<ContourPlotOptions>;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options?: ContourPlotOptions
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.options = {
      gridSize: options?.gridSize || 150,
      levels: options?.levels || [
        0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
      ],
      lineWidth: options?.lineWidth || 1,
      lineColor: options?.lineColor || "rgba(255, 255, 255, 0.8)",
      fillOpacity: options?.fillOpacity || 0.5,
    };
  }

  private calculateGrid(points: Point[], viewport: ViewportState) {
    const grid: number[][] = Array(this.options.gridSize)
      .fill(0)
      .map(() => Array(this.options.gridSize).fill(0));

    const cellWidth = this.width / this.options.gridSize;
    const cellHeight = this.height / this.options.gridSize;
    const sigma = 30 / viewport.scale; // Fixed sigma based on zoom
    let maxValue = 0;

    // Calculate grid values
    for (let i = 0; i < this.options.gridSize; i++) {
      for (let j = 0; j < this.options.gridSize; j++) {
        const worldX = (i * cellWidth - viewport.offset.x) / viewport.scale;
        const worldY = (j * cellHeight - viewport.offset.y) / viewport.scale;

        let value = 0;
        points.forEach((point) => {
          const dx = worldX - point.x;
          const dy = worldY - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          value +=
            point.value *
            Math.exp(-(distance * distance) / (2 * sigma * sigma));
        });

        grid[i][j] = value;
        maxValue = Math.max(maxValue, value);
      }
    }

    // Normalize grid values
    for (let i = 0; i < this.options.gridSize; i++) {
      for (let j = 0; j < this.options.gridSize; j++) {
        grid[i][j] /= maxValue;
      }
    }

    return { grid, cellWidth, cellHeight };
  }

  public draw(points: Point[], viewport: ViewportState) {
    const { grid, cellWidth, cellHeight } = this.calculateGrid(
      points,
      viewport
    );

    // Draw filled regions
    this.options.levels.forEach((level, index) => {
      this.ctx.beginPath();

      for (let i = 0; i < this.options.gridSize - 1; i++) {
        for (let j = 0; j < this.options.gridSize - 1; j++) {
          if (grid[i][j] >= level) {
            this.ctx.rect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
          }
        }
      }

      const hue = 240 * (1 - level); // Blue (240) to Red (0)
      this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${this.options.fillOpacity})`;
      this.ctx.fill();
    });

    // Draw contour lines
    this.options.levels.forEach((level) => {
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.options.lineColor;
      this.ctx.lineWidth = this.options.lineWidth;

      for (let i = 0; i < this.options.gridSize - 1; i++) {
        for (let j = 0; j < this.options.gridSize - 1; j++) {
          const values = [
            grid[i][j],
            grid[i + 1][j],
            grid[i + 1][j + 1],
            grid[i][j + 1],
          ];

          if (Math.min(...values) <= level && Math.max(...values) >= level) {
            const x = i * cellWidth;
            const y = j * cellHeight;
            this.drawContourLines(x, y, values, level, cellWidth, cellHeight);
          }
        }
      }
      this.ctx.stroke();
    });
  }

  private drawContourLines(
    x: number,
    y: number,
    values: number[],
    level: number,
    cellWidth: number,
    cellHeight: number
  ) {
    const points: [number, number][] = [];

    // Interpolate points where contour crosses cell edges
    if (
      (values[0] < level && values[1] >= level) ||
      (values[1] < level && values[0] >= level)
    ) {
      const t = (level - values[0]) / (values[1] - values[0]);
      points.push([x + t * cellWidth, y]);
    }
    if (
      (values[1] < level && values[2] >= level) ||
      (values[2] < level && values[1] >= level)
    ) {
      const t = (level - values[1]) / (values[2] - values[1]);
      points.push([x + cellWidth, y + t * cellHeight]);
    }
    if (
      (values[2] < level && values[3] >= level) ||
      (values[3] < level && values[2] >= level)
    ) {
      const t = (level - values[3]) / (values[2] - values[3]);
      points.push([x + (1 - t) * cellWidth, y + cellHeight]);
    }
    if (
      (values[3] < level && values[0] >= level) ||
      (values[0] < level && values[3] >= level)
    ) {
      const t = (level - values[3]) / (values[0] - values[3]);
      points.push([x, y + (1 - t) * cellHeight]);
    }

    // Draw line segments
    if (points.length >= 2) {
      this.ctx.moveTo(points[0][0], points[0][1]);
      this.ctx.lineTo(points[1][0], points[1][1]);
    }
  }
}
