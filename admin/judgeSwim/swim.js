let selectedHeat = null;
let selectedLane = null;
let selectedContestant = null;

function enterFullScreen(){
    document.body.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
}
function exitFullscreen(){
    document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
    });
}

class Server{
    constructor(){
        this.serverPath = '../../server/';
        this.serverDelay = localStorage.getItem("serverDelay") != null ? parseInt(localStorage.getItem("serverDelay")) : 0;
        this.connected = false;

        this.heats = [];
        this.lanes = [];
        this.contestants = [];

        this.startTime = 0;
        this.ended = false;
    }
    init(){
        if(this.connected) return;

        fetch(this.serverPath+'getSwimInformation.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(log => {
            if(!log.admin){
                window.location.href = "../checkin.php";
            }
            if(log.success){
                this.connected = true;
                this.lanes = log.lanes;
                this.heats = log.heats;

                document.getElementById("heat_n_lane_select_heat").innerHTML = this.heats.length ? this.heats[0] : "NONE";
                document.getElementById("heat_n_lane_select_lane").innerHTML = this.lanes.length ? this.lanes[0] : "NONE";
                selectedHeat = this.heats.length ? this.heats[0] : null;
                selectedLane = this.lanes.length ? this.lanes[0] : null;
                renderContestants();

                let heatSelecter = document.getElementById("heat_selecter");
                heatSelecter.innerHTML = "";
                for(var i = 0; i < this.heats.length; i++){
                    let heat = document.createElement("div");
                    heat.setAttribute("value", this.heats[i]);
                    heat.innerHTML = this.heats[i];
                    heat.addEventListener("click", function(){
                        selectedHeat = this.getAttribute("value");
                        document.getElementById("heat_n_lane_select_heat").innerHTML = selectedHeat;
                        // exitFullscreen();
                        hideForeground();
                        renderContestants();
                        renderRegisteredTimes();
                    });
                    heatSelecter.appendChild(heat);
                }

                let laneSelecter = document.getElementById("lane_selecter");
                laneSelecter.innerHTML = "";
                for(var i = 0; i < this.lanes.length; i++){
                    let lane = document.createElement("div");
                    lane.setAttribute("value", this.lanes[i]);
                    lane.innerHTML = this.lanes[i];
                    lane.addEventListener("click", function(){
                        selectedLane = parseInt(this.getAttribute("value"));
                        document.getElementById("heat_n_lane_select_lane").innerHTML = selectedLane;
                        // exitFullscreen();
                        hideForeground();
                        renderContestants();
                        renderRegisteredTimes();
                    });
                    laneSelecter.appendChild(lane);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });


        this.loadContestants();
        setInterval((event) => this.#loop(), 1000); // TODO
    }

    loadContestants(){
        fetch(this.serverPath+'getContestants.php', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(log => {
            if(log.success){
                this.contestants = log.contestants;
                renderContestants();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    registerTime(startNr, timestamp){
        const data = {
            startNr: startNr,
            time: timestamp
        };

        fetch(this.serverPath+'setSwimTime.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(log => {
            if(log.success){
                this.loadContestants();
                hideForeground();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        }); 
        
    }
    #loop(){
        const data = {
            heat: selectedHeat,
            lane: selectedLane
        }
        fetch(this.serverPath+'getSwimHeatLane.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(log => {
            //console.log(log);
            if(log.success){
                this.ended = log.ended;
                this.startTime = log.startTime;
                renderRegisteredTimes();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });    
    }
    now(){
        return new Date().getTime()+this.serverDelay;
    }
}

let server = new Server();
server.init();

function hideForeground(){
    document.getElementById("foreground").style.display = "none";
}
document.getElementById("foreground_exit").addEventListener("click", function(){
    // exitFullscreen();
    hideForeground();
});

function clearForeground(){
    let foreground = document.getElementById("foreground");
    foreground.style.display = "flex";
    let children = foreground.children;
    for(var i = 0; i < children.length; i++){
        children[i].style.display = "none";
    }
}


document.getElementById("heat_n_lane_select_heat").addEventListener("click", function(){
    // enterFullScreen();
    clearForeground();
    document.getElementById("heat_selecter").style.display = "flex";
});
document.getElementById("heat_n_lane_select_lane").addEventListener("click", function(){
    // enterFullScreen();
    clearForeground();
    document.getElementById("lane_selecter").style.display = "flex";
});


function renderContestants(){

    if(server.contestants.length == 0 || selectedHeat == null, selectedLane == null) return;

    let participantsEl = document.getElementById("participants");
    participantsEl.innerHTML = "";

    for(var i = 0; i < server.contestants.length; i++){

        if(server.contestants[i].heat != selectedHeat || server.contestants[i].lane != selectedLane) continue; 
        let swimmer = document.createElement("div");
        swimmer.setAttribute("startNr", server.contestants[i].startNr);
        swimmer.innerHTML = server.contestants[i].startNr + ", "+server.contestants[i].name+(server.contestants[i].swimTime?", "+formatTime(server.contestants[i].swimTime, true) : "");
        swimmer.addEventListener("click", function(){
            selectedContestant = parseInt(this.getAttribute("startNr"));

            clearForeground();
            createAssignTimeOptions();
            document.getElementById("foreground").style.display = "flex";
            document.getElementById("assign_Time").style.display = "flex";
            
        })

        participantsEl.appendChild(swimmer);
    }
}

function createAssignTimeOptions(){
    if(server.startTime == 0) return; 

    let assignTimeEl = document.getElementById("assign_Time");
    assignTimeEl.innerHTML = "";

    let list = [];
    if(localStorage.getItem("h"+selectedHeat+"l"+selectedLane) != null){
        list = JSON.parse(localStorage.getItem("h"+selectedHeat+"l"+selectedLane));
    }

    if (list.length == 0){
        document.getElementById("foreground").style.display = "none";
        return;
    }

    for(var i = 0; i < list.length; i++){
        let assignOption = document.createElement("div");
        assignOption.setAttribute("time", list[i]);
        assignOption.innerHTML = formatTime(list[i] - server.startTime, true);
        assignOption.addEventListener("click", function(){
            server.registerTime(selectedContestant, this.getAttribute("time"));
        });
        if(list[i] - server.startTime > 0){
            assignTimeEl.appendChild(assignOption);
        }
    }
}


function renderStatus(){
    let statusBar = document.getElementById("heat_n_lane_status");
    let mainButton = document.getElementById("register_time");
    if (server.ended == false && server.startTime == 0){
        statusBar.innerHTML = "Wait 4 Start";
        statusBar.style.backgroundColor = "orange";
        mainButton.style.backgroundColor = "black";
    }
    else if(server.ended == false && server.startTime > 0){
        let dt = server.now() - server.startTime;
        statusBar.innerHTML = formatTime(dt, (dt<5000));
        statusBar.style.backgroundColor = "green";
        mainButton.style.backgroundColor = "green";
    }
    else if(server.ended){
        statusBar.innerHTML = "Race Finished";
        statusBar.style.backgroundColor = "black";
        mainButton.style.backgroundColor = "black";
    }
}
setInterval(renderStatus, 20);

document.getElementById("register_time").addEventListener("click", registerTime);

function registerTime(){
    let now = server.now();

    if (server.ended || now < server.startTime) return;    

    let list = [];
    if(localStorage.getItem("h"+selectedHeat+"l"+selectedLane) != null){
        list = JSON.parse(localStorage.getItem("h"+selectedHeat+"l"+selectedLane));
    }

    list.push(now);    
    localStorage.setItem("h"+selectedHeat+"l"+selectedLane, JSON.stringify(list));
    renderRegisteredTimes();
}

function renderRegisteredTimes(){
    if(server.startTime == 0) return;
    let list = [];
    if(localStorage.getItem("h"+selectedHeat+"l"+selectedLane) != null){
        list = JSON.parse(localStorage.getItem("h"+selectedHeat+"l"+selectedLane));
    }
    let listEl = document.getElementById("registered_times");
    listEl.innerHTML = "";
    for(var i = 0; i < list.length; i++){
        if(list[i] - server.startTime <= 0) continue;
        listEl.innerHTML += formatTime(list[i] - server.startTime, true) + "<br>";
    }
}

function formatTime(ms, displayMS = false){
    var isNegative = ms < 0;
    ms = Math.abs(ms);
    let h = 60*60*1000;
    let m = 60*1000;
    let s = 1000;
    var hours = Math.floor(ms/h);
    ms -= hours*h;
    var minutes = Math.floor(ms/m);
    ms -= minutes*m;
    var seconds = Math.floor(ms/s);
    ms -= seconds*s;
    if (hours < 10) hours = "0"+hours;
    if (minutes < 10) minutes = "0"+minutes;
    if (seconds < 10) seconds = "0"+seconds;
    
    let time = (isNegative?"- ":"")+hours+":"+minutes+":"+seconds;
    if (displayMS) {
        if (ms < 10){
            ms = "00"+ms;
        } 
        else if(ms < 100){
            ms = "0"+ms;
        }
        else{
            ms = ""+ms;
        }
        time += "."+ms[0]+ms[1];
    }
    return time;
}
