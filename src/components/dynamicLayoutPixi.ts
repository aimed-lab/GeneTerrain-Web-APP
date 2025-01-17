import * as PIXI from "pixi.js";

interface HeatmapPoint {
  x: number;
  y: number;
  value: number;
  gene?: string;
}

async function renderHeatmap(
  divId: string,
  xData: number[],
  yData: number[],
  values: number[][],
  genes: string[]
): Promise<void> {
  try {
    const container = document.getElementById(divId);

    if (!container) {
      console.error(`Container with ID '${divId}' not found.`);
      return;
    }

    // Ensure a canvas exists within the container
    let canvas = container.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement("canvas");
      container.innerHTML = ""; // Clear previous content
      container.appendChild(canvas);
    }

    // Set canvas dimensions
    canvas.width = Math.min(600, container.clientWidth);
    canvas.height = Math.min(600, container.clientHeight);

    // Verify canvas dimensions
    if (!canvas.width || !canvas.height) {
      console.error("Canvas dimensions are not properly set.");
      return;
    }

    // Initialize Pixi.js Renderer and Stage manually
    const renderer = await PIXI.autoDetectRenderer({
      view: canvas,
      width: canvas.width,
      height: canvas.height,
      antialias: true,
      backgroundColor: 0xf9f9f9,
      resolution: window.devicePixelRatio || 1,
    });

    const stage = new PIXI.Container();

    // Prepare heatmap data
    const heatmapData: HeatmapPoint[] = [];
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        heatmapData.push({
          x: i,
          y: j,
          value: values[i][j],
        });
      }
    }

    // Add gene-specific data points
    const geneData: HeatmapPoint[] = xData.map((x, index) => ({
      x,
      y: yData[index],
      value: 0,
      gene: genes[index],
    }));

    // Combine heatmap data and gene data
    const combinedData = [...heatmapData, ...geneData];

    // Heatmap container
    const heatmapContainer = new PIXI.Container();
    stage.addChild(heatmapContainer);

    // Tooltip setup
    const tooltip = document.createElement("div");
    tooltip.style.cssText =
      "position: absolute; padding: 5px; background: rgba(0,0,0,0.7); color: #fff; border-radius: 4px; font-size: 12px; display: none;";
    container.appendChild(tooltip);

    // Render points
    async function render(): Promise<void> {
      heatmapContainer.removeChildren();
      combinedData.forEach((point) => {
        const circle = new PIXI.Graphics();

        let color: number;
        if (point.gene) {
          color = 0x0000ff; // Blue for gene points
        } else {
          if (point.value < 0) {
            // Map negative values to blue
            const intensity = Math.min(255, Math.abs(point.value) * 255);
            color = (0 << 16) | (0 << 8) | intensity; // RGB: (0, 0, intensity)
          } else if (point.value > 0) {
            // Map positive values to red
            const intensity = Math.min(255, point.value * 255);
            color = (intensity << 16) | (0 << 8) | 0; // RGB: (intensity, 0, 0)
          } else {
            // Map values close to 0 to green
            color = (0 << 16) | (255 << 8) | 0; // RGB: (0, 255, 0)
          }
        }

        circle.beginFill(color, 0.6);
        circle.drawCircle(0, 0, point.gene ? 8 : 4); // Larger circle for gene points
        circle.endFill();
        circle.x = point.x * (canvas.width / values.length);
        circle.y = point.y * (canvas.height / values[0].length);
        heatmapContainer.addChild(circle);

        // Add tooltip interactivity
        circle.interactive = true;
        circle.on("mouseover", (event: any) => {
          tooltip.style.display = "block";
          tooltip.style.left = `${event.data.global.x + 10}px`;
          tooltip.style.top = `${event.data.global.y + 10}px`;
          tooltip.textContent = point.gene
            ? `Gene: ${point.gene}`
            : `Value: ${point.value.toFixed(2)}`;
        });
        circle.on("mouseout", () => (tooltip.style.display = "none"));
      });

      await renderer.render(stage);
    }

    await render();

    // Zoom and pan functionality
    let scale = 1;
    let isDragging = false;
    let start = { x: 0, y: 0 };

    canvas.addEventListener("wheel", async (event: WheelEvent) => {
      const direction = event.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(0.5, Math.min(5, scale + direction));

      // Get the position of the mouse relative to the canvas
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      // Calculate the position of the mouse relative to the heatmap
      const worldPosBefore = {
        x: (mouseX - heatmapContainer.x) / scale,
        y: (mouseY - heatmapContainer.y) / scale,
      };

      // Update scale and adjust position
      heatmapContainer.scale.set(newScale);
      heatmapContainer.x = mouseX - worldPosBefore.x * newScale;
      heatmapContainer.y = mouseY - worldPosBefore.y * newScale;

      scale = newScale;
      await renderer.render(stage);
    });

    canvas.addEventListener("mousedown", (event: MouseEvent) => {
      isDragging = true;
      start.x = event.clientX;
      start.y = event.clientY;
    });

    canvas.addEventListener("mousemove", async (event: MouseEvent) => {
      if (isDragging) {
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        heatmapContainer.x += dx;
        heatmapContainer.y += dy;
        start.x = event.clientX;
        start.y = event.clientY;
        await renderer.render(stage);
      }
    });

    canvas.addEventListener("mouseup", () => (isDragging = false));
    canvas.addEventListener("mouseleave", () => (isDragging = false));
  } catch (error) {
    console.error("Error initializing heatmap:", error);
  }
}

export default renderHeatmap;
