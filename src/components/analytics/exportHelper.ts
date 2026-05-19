
import { DashboardConfig, AnalyticsChartConfig } from "./types";

export const generateStandaloneHtml = (config: DashboardConfig, headers: string[], theme: string) => {
    const configJson = JSON.stringify(config);
    const headersJson = JSON.stringify(headers);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GeneTerrain Report | ${config.dashboardTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} p-8">
    <div class="max-w-7xl mx-auto space-y-8">
        <header class="space-y-4">
            <h1 class="text-4xl font-black tracking-tight">${config.dashboardTitle}</h1>
            <p class="text-gray-500 italic max-w-4xl">${config.summary}</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            ${config.charts.map((c: AnalyticsChartConfig) => `
                <div class="${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border p-6 rounded-2xl shadow-sm h-[450px] flex flex-col">
                    <h3 class="text-xs font-black uppercase tracking-widest mb-1">${c.title}</h3>
                    <p class="text-[10px] text-gray-500 mb-4">${c.description || ''}</p>
                    <div id="chart-${c.id}" class="flex-1"></div>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        const config = ${configJson};
        // Simplified plot logic for static export
        config.charts.forEach(c => {
            const layout = {
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: { size: 10, color: '${theme === 'dark' ? '#94a3b8' : '#475569'}' },
                margin: { l: 50, r: 20, t: 30, b: 50 }
            };
            Plotly.newPlot('chart-' + c.id, [{ 
                type: c.type === 'boxplot' ? 'box' : c.type, 
                name: c.title,
                marker: { color: c.color || '#3182CE' }
            }], layout, { responsive: true, displayModeBar: false });
        });
    </script>
</body>
</html>`;
};
