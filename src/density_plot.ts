import h337 from './heatmap.min.js'
export const drawDensityPlot =  () => {
    alert('hey')
    // Initialize heatmap
    const heatmapInstance = h337.create({
        container: document.getElementById('canvas-div'),
        radius: 40,
        maxOpacity: 0.8,
        minOpacity: 0,
        blur: 0.8
    });

    // Define data for three heatmaps with different sigmas
    const heatmapData = [
        { sigma: 0.5, data: generateData(0.5) },
        { sigma: 1.0, data: generateData(1.0) },
        { sigma: 1.5, data: generateData(1.5) }
    ];

    // Function to generate random data points
    function generateData(sigma) {
        const points = [];
        for (let i = 0; i < 200; i++) {
            points.push({
                x: Math.floor(Math.random() * 500),
                y: Math.floor(Math.random() * 300),
                value: Math.random() * sigma
            });
        }
        return points;
    }

    let currentZoom = 0;

    // Function to update heatmap
    function updateHeatmap(zoom) {
        zoom = Math.max(0, Math.min(2, zoom)); // Clamp zoom between 0 and 2
        const index = Math.floor(zoom);
        const fraction = zoom - index;
        
        let data;
        if (fraction === 0) {
            data = heatmapData[index].data;
        } else {
            // Interpolate between two adjacent heatmaps
            const data1 = heatmapData[index].data;
            const data2 = heatmapData[index + 1].data;
            data = data1.map((point, i) => ({
                x: point.x,
                y: point.y,
                value: point.value * (1 - fraction) + data2[i].value * fraction
            }));
        }
        
        heatmapInstance.setData({
            max: Math.max(...data.map(point => point.value)),
            data: data
        });

        // Update sigma value display
        const sigma = heatmapData[index].sigma * (1 - fraction) + 
                    (heatmapData[index + 1] ? heatmapData[index + 1].sigma : heatmapData[index].sigma) * fraction;
        document.getElementById('sigma-value').textContent = `Sigma: ${sigma.toFixed(2)}`;
    }

    // Add event listener for mouse wheel
    document.getElementById('canvas-div').addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        currentZoom += e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        currentZoom = Math.max(0, Math.min(2, currentZoom)); // Clamp zoom between 0 and 2
        updateHeatmap(currentZoom);
    });

    // Initial heatmap render
    updateHeatmap(currentZoom);
};