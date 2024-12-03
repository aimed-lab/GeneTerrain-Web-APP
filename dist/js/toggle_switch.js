const toggleSwitch = (e) => {
    var barChartDiv = document.querySelector('.barChartsDiv'); 
    var sliderGT = document.getElementById('nav-comp-before-after') 
    if(e.innerText==='Bar Chart'){
        barChartDiv.style.display='block'
        // deactivateAllTabs('nav-compare')
        sliderGT.className='tab-pane fade'
    }
    else{
        barChartDiv.style.display='none'
        deactivateAllTabs('nav-compare')
        sliderGT.className='tab-pane fade show active'
    }
}

const toggleSwitchPathway = (e) => {
    var barChartDiv = document.querySelector('.selectedResultBarAndFilters'); 
    var network = document.getElementById('nav-network') 
    if(e.innerText==='Bar Chart'){
        barChartDiv.style.display='block'
        // deactivateAllTabs('nav-compare')
        network.className='tab-pane fade'
    }
    else{
        barChartDiv.style.display='none'
        deactivateAllTabs('nav-pathway')
        network.className='tab-pane fade show active'
    }
}

const deactivateAllTabs = (ignore)=>{
    var tabs = document.querySelectorAll('tab-pane');
    tabs.forEach((tab)=>{
        if(tab.id===ignore)
            return
        tab.className='tab-pane fade'
    })
}