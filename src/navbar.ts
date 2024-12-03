var navDivObj = {

}
var boldColor = '#144B39', color="#144B39"
var storePlotlyDiv = document.getElementById("store-plotly-div") as HTMLInputElement;
export function navbar(){
    storePlotlyDiv.value = "canvas-div"
    var tabs = document.querySelectorAll<HTMLAnchorElement>('.nav-item')
    tabs.forEach(function(tab){
        tab.addEventListener('click',()=>{
            tab.parentElement.style.fontWeight='bold'
            tab.parentElement.style.backgroundColor=boldColor;
            tab.className="nav-item active"
            tab.ariaSelected='true'
            var tabContent = document.getElementById(tab.id.replace("-tab","")) as HTMLDivElement;
            if(tabContent.id=="nav-pathway-details")
                storePlotlyDiv.value="canvas-tab2-01-copy"
            tabContent.className='tab-pane fade show active'
            tabs.forEach((tab1)=>{
                if(tab!=tab1){
                    tab1.parentElement.style.fontWeight='normal'
                    tab1.parentElement.style.backgroundColor=color
                    tab1.className='nav-item';
                    tab1.ariaSelected='false';
                    var tabContent1 = document.getElementById(tab1.id.replace("-tab","")) as HTMLDivElement;
                    tabContent1.className='tab-pane fade show'
                }
            })
        })
    })
}