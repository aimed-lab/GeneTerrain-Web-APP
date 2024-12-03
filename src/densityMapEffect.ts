import * as PIXI from 'pixi.js';
import * as d3 from 'd3';
import $ from 'jquery';
import 'jquery-ui/ui/widgets/slider'; // Import jQuery UI slider

interface GeneData {
    x: number;
    y: number;
    name: string;
    expression: number;
    rpScore: number;
}

export function createGeneExpressionPlot(data: GeneData[]): void {
    const size = 800;
    const resolution = 400;
    let sigma = 20;
    let colorScaleMin = -3;
    let colorScaleMax = 3;
    let showGeneNames = true;

    const app = new PIXI.Application({
        width: size,
        height: size,
        backgroundColor: 0xFFFFFF,
        resolution: window.devicePixelRatio || 1,
        antialias: true
    });

    const plotContainer = document.getElementById('plotContainer');
    if (plotContainer) {
        plotContainer.appendChild(app.view);
    }

    const mainContainer = new PIXI.Container();
    const heatmapContainer = new PIXI.Container();
    const geneContainer = new PIXI.Container();
    mainContainer.addChild(heatmapContainer, geneContainer);
    app.stage.addChild(mainContainer);

    const mask = new PIXI.Graphics().beginFill(0xFFFFFF).drawRect(0, 0, size, size).endFill();
    mainContainer.mask = mask;
    app.stage.addChild(mask);

    function gaussian(x: number, mean: number, sigma: number, weight: number): number {
        return weight * Math.exp(-((x - mean) ** 2) / (2 * sigma ** 2));
    }

    const heatmapTexture = PIXI.RenderTexture.create({ width: resolution, height: resolution });
    const heatmapSprite = new PIXI.Sprite(heatmapTexture);
    heatmapSprite.width = heatmapSprite.height = size;
    heatmapContainer.addChild(heatmapSprite);

    function updateHeatmap(filteredData: GeneData[] = data): void {
        const heatmapData = Array.from({ length: resolution }, () => new Float32Array(resolution));

        filteredData.forEach(gene => {
            const geneX = Math.floor(gene.x / size * resolution);
            const geneY = Math.floor(gene.y / size * resolution);
            const range = Math.ceil(sigma / size * resolution * 3);

            for (let i = Math.max(0, geneX - range); i < Math.min(resolution, geneX + range); i++) {
                for (let j = Math.max(0, geneY - range); j < Math.min(resolution, geneY + range); j++) {
                    const distance = Math.sqrt((i - geneX) ** 2 + (j - geneY) ** 2);
                    heatmapData[j][i] += gaussian(distance, 0, sigma / size * resolution, gene.rpScore) * gene.expression;
                }
            }
        });

        const colorScale = d3.scaleSequential(d3.interpolateRdYlBu)
            .domain([colorScaleMax, colorScaleMin]);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempCanvas.height = resolution;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.createImageData(resolution, resolution);

        heatmapData.forEach((row, j) => {
            row.forEach((value, i) => {
                const color = d3.color(colorScale(value));
                if (color) {
                    const index = (j * resolution + i) * 4;
                    imageData.data[index] = color['r'] ?? 0;
                    imageData.data[index + 1] = color['g'] ?? 0;
                    imageData.data[index + 2] = color['b'] ?? 0;
                    imageData.data[index + 3] = 179; // 0.7 opacity
                }
            });
        });

        ctx.putImageData(imageData, 0, 0);
        heatmapSprite.texture = PIXI.Texture.from(tempCanvas);
    }

    updateHeatmap();

    const geneTextures: Record<string, any> = {};
    data.forEach(gene => {
        const marker = new PIXI.Graphics().beginFill(0xD3D3D3).drawCircle(0, 0, 5).endFill();
        marker.x = gene.x;
        marker.y = gene.y;
        geneContainer.addChild(marker);

        const geneText = new PIXI.Text(gene.name, {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0x000000,
            align: 'center'
        });
        geneText.anchor.set(0.5);
        geneText.x = gene.x;
        geneText.y = gene.y - 10;
        geneContainer.addChild(geneText);

        gene['marker'] = marker;
        gene['text'] = geneText;
    });

    const toggleButton = document.getElementById("toggleNamesButton");
    if (toggleButton) {
        toggleButton.addEventListener("click", () => {
            showGeneNames = !showGeneNames;
            geneContainer.children.forEach(child => {
                if (child instanceof PIXI.Text) {
                    child.visible = showGeneNames;
                }
            });
            toggleButton.textContent = showGeneNames ? "Hide Gene Names" : "Show Gene Names";
        });
    }

    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0, 20])
        .on("zoom", zoomed);

    d3.select(app.view as HTMLCanvasElement).call(zoom);

    const initialTransform = d3.zoomIdentity;

    d3.select(app.view as HTMLCanvasElement).call(zoom.transform, initialTransform);

    function zoomed(event: any): void {
        const { x, y, k } = event.transform;
        mainContainer.scale.set(k);
        mainContainer.position.set(x, y);
        sigma = 20 / k;

        geneContainer.children.forEach(child => {
            if (child instanceof PIXI.Graphics) {
                child.scale.set(1 / k);
            } else if (child instanceof PIXI.Text) {
                child.scale.set(1 / k);
                const adjustedPosition = child.parent.toLocal(new PIXI.Point(child.position.x * k + x, child.position.y * k + y));
                child.x = adjustedPosition.x;
                child.y = adjustedPosition.y - 0 / k;
            }
        });

        updateHeatmap();
    }

    d3.select("#zoomIn").on("click", () => d3.select(app.view).transition().call(zoom.scaleBy, 1.5));
    d3.select("#zoomOut").on("click", () => d3.select(app.view).transition().call(zoom.scaleBy, 0.8));
    d3.select("#resetView").on("click", () => d3.select(app.view).transition().call(zoom.transform, initialTransform));

    $("#searchGene, #filterValue").on("input", applyFilters);

    function applyFilters(): void {
        const searchTerms = ($("#searchGene").val() as string).toLowerCase().split(",").map(s => s.trim()).filter(s => s.length > 0);
        const filterValue = $("#filterValue").val() as string;

        let filteredData = data;

        if (searchTerms.length > 0) {
            filteredData = filteredData.filter(gene => searchTerms.some(term => gene.name.toLowerCase().includes(term)));
        }

        if (filterValue) {
            const conditions = filterValue.split(",").map(s => s.trim());
            filteredData = filteredData.filter(gene =>
                conditions.every(cond => {
                    if (cond.startsWith(">")) return gene.expression > parseFloat(cond.slice(1));
                    if (cond.startsWith("<")) return gene.expression < parseFloat(cond.slice(1));
                    return true;
                })
            );
        }

        updateHeatmap(filteredData);
        updateVisibility(filteredData);
    }

    function updateVisibility(filteredData: GeneData[]): void {
        const visibleGenes = new Set(filteredData.map(gene => gene.name));
        geneContainer.children.forEach(child => {
            if (child instanceof PIXI.Text) {
                const isVisible = visibleGenes.has(child.text);
                child.visible = isVisible && showGeneNames;
                const marker = child.parent.children.find(sibling => sibling instanceof PIXI.Graphics && sibling.x === child.x && sibling.y === child.y + 10);
                if (marker) marker.visible = isVisible;
            }
        });
    }

    const geneInfo = d3.select("#geneInfo");
    app.view.addEventListener("mousemove", function(event: MouseEvent) {
        const bounds = app.view.getBoundingClientRect();
        const scaledX = (event.clientX - bounds.left - mainContainer.position.x) / mainContainer.scale.x;
        const scaledY = (event.clientY - bounds.top - mainContainer.position.y) / mainContainer.scale.y;

        const nearestGene = data.reduce((nearest, gene) => {
            const distance = Math.hypot(gene.x - scaledX, gene.y - scaledY);
            return distance < nearest.distance ? { gene, distance } : nearest;
        }, { distance: Infinity })['gene'];

        if (nearestGene) {
            geneInfo.html(`
                <strong>${nearestGene.name}</strong><br>
                Expression: ${nearestGene.expression.toFixed(2)}<br>
                Rp Score: ${nearestGene.rpScore.toFixed(2)}
            `);
        }
    });
}

// Transform the sampleData into the required format
const sampleData = {
    x: [1, 2, 3],
    y: [1, 2, 3],
    name: ['a', 'b', 'c'],
    expression: [1, 2, 3],
    rpScore: [1, 2, 3]
};

// Transform into array of objects
const formattedData: GeneData[] = sampleData.x.map((_, i) => ({
    x: sampleData.x[i],
    y: sampleData.y[i],
    name: sampleData.name[i],
    expression: sampleData.expression[i],
    rpScore: sampleData.rpScore[i]
}));

// Initialize plot with formatted data
createGeneExpressionPlot(formattedData);
