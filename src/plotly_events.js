import * as Plotly from 'plotly.js-dist';

export function generateBarPlot(){
    var graphDiv = document.getElementById('canvas-div01');
    graphDiv.addEventListener('click', ()=>{
        graphDiv.on('plotly_selected',function(eventData){
        alert('hurray')
        console.log(eventData);
        // console.log(eventData.currentTarget.data[1].selectedpoints)
        // console.log(eventData.currentTarget.data[1].selectedpoints[0].x)
        var pt=[]
        var ptx=[], pty=[]
        eventData.points.forEach(function(pt) {
            ptx.push(pt.x);
            pty.push(pt.y)
            console.log(pt.x);
            console.log(pt.y)
            console.log(pt.text)
        });
        var barTrace = [{
            x: ptx,
            y: pty,
            type: 'bar'
        }];
        Plotly.newPlot('bar-chart',barTrace, plotLayout);
        })
    })
}