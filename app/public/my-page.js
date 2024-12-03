
document.getElementById("uploadImageBtn").addEventListener("click", () => {
    document.getElementById("imageUploader").click();
});

document.getElementById("uploadMusicBtn").addEventListener("click", () => {
    document.getElementById("musicUploader").click();
});

document.getElementById("imageUploader").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById("workspace").style.backgroundImage = `url(${e.target.result})`;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById("musicUploader").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const audio = document.getElementById("backgroundMusic");
        audio.src = url;
        audio.hidden = false;
        audio.play();
    }
});

document.getElementById("toggleSidebarBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("show-sidebar");
});

let onClickOutside = (element, callback) => {
    document.addEventListener('click', e => {
      if (!element.contains(e.target)) callback();
    });
  };

function startTimer(button) {
    const widget = button.parentElement;
    const hours = parseInt(widget.querySelector('.hoursInput').value) || 0;
    const minutes = parseInt(widget.querySelector('.minutesInput').value) || 0;
    const seconds = parseInt(widget.querySelector('.secondsInput').value) || 0;
    
    widget.dataset.remainingTime = hours * 3600 + minutes * 60 + seconds;

    if (widget.dataset.timerInterval) return;

    widget.dataset.timerInterval = setInterval(() => {
        if (widget.dataset.remainingTime > 0) {
            widget.dataset.remainingTime--;
            updateTimerDisplay(widget);
        } else {
            stopTimer(button);
        }
    }, 1000);
}

function pauseTimer(button) {
    const widget = button.parentElement;
    clearInterval(widget.dataset.timerInterval);
    widget.dataset.timerInterval = '';
}

function stopTimer(button) {
    const widget = button.parentElement;
    clearInterval(widget.dataset.timerInterval);
    widget.dataset.timerInterval = '';
    widget.dataset.remainingTime = 0;
    updateTimerDisplay(widget);
}

function updateTimerDisplay(widget) {
    let remainingTime = parseInt(widget.dataset.remainingTime);
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const seconds = remainingTime % 60;
    
    const display = widget.querySelector('.timerDisplay');
    display.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


function addNote() {
    const note = document.createElement("div");
    note.classList.add("widget", "note");
    
    note.innerHTML = `<input type="text" class="content" placeholder="Write your note here...">`;
    makeDraggable(note);
    document.getElementById("workspace").appendChild(note);

    let count = document.getElementById('workspace').children.length;


    onClickOutside(document.getElementById('workspace').children[count - 1], function() {
        let contentInput = document.querySelector('.content');

        console.log(contentInput.value);

        // fetch("notes/add", {
        //     method: "POST",

        //     headers: {
        //         'Accept': 'application/json',
        //         'Content-Type': 'application/json'
        //     },
        
        //     body: JSON.stringify({
        //         content: contentInput.value
        //     })
        // })
        
        // .then(response => {
        //     return response.body;
        // }).then(body => {
        //     console.log(body);
        // }).catch(error => {
        //     console.log(error);
        // });
        // console.log("Sent request POST /notes/add"); 
    })
}

function addTaskList() {
    const taskList = document.createElement("div");
    taskList.classList.add("widget", "task-list");
    taskList.innerHTML = `
        <ul>
            <li><input type="checkbox"> <span contenteditable="true">Task 1</span></li>
            <li><input type="checkbox"> <span contenteditable="true">Task 2</span></li>
            <li><input type="checkbox"> <span contenteditable="true">Task 3</span></li>
        </ul>
        <button onclick="addTask(this)">Add Task</button>
    `;
    makeDraggable(taskList);
    document.getElementById("workspace").appendChild(taskList);
}

function addTask(button) {
    const ul = button.previousElementSibling;
    const newTask = document.createElement("div");
    newTask.innerHTML = `<ul id="taskList">
                <input type="checkbox"><input type="text" class="task-title" placeholder="New Task">
                <label for="date" placeholder="MM-DD-YYYY">Due date:</label>
                <input type="date" class="input-due">
            </ul>
            `;
    ul.appendChild(newTask);

    let count = document.getElementById('workspace').children.length;

    onClickOutside(document.getElementById('workspace').children[count - 1], function() {
        let taskTitle = document.querySelector('.task-title');
        let dueDateInput = document.querySelector('.input-due');

        console.log(taskTitle.value);
        console.log(dueDateInput.value);

        fetch("task/add", {
            method: "POST",

            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
        
            body: JSON.stringify({
                title: taskTitle.value,
                due: dueDateInput.value,
                progress: false
            })
        })
        
        .then(response => {
            return response.body;
        }).then(body => {
            console.log(body);
        }).catch(error => {
            console.log(error);
        });
        console.log("Sent request POST /task/add"); 
    })
}

function makeDraggable(element) {
    let isDragging = false, startX, startY;
    element.onmousedown = (e) => {
        isDragging = true;
        startX = e.clientX - element.offsetLeft;
        startY = e.clientY - element.offsetTop;
        document.onmousemove = (e) => {
            if (isDragging) {
                element.style.left = `${e.clientX - startX}px`;
                element.style.top = `${e.clientY - startY}px`;
            }
        };
        document.onmouseup = () => {
            isDragging = false;
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

function strike(id, checkbox) {
    let row =  document.getElementById(id);
    let title = row.querySelector('.title').textContent;
    let due = row.querySelector('.due').textContent;
    if (checkbox.checked) {
        row.style.textDecoration = "line-through";
        // TO-DO: Send patch request
        fetch("task/update", {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            method: "PATCH",

            body: JSON.stringify({
                title: title,
                progress: true
            })
        })
    } else {
        row.style.textDecoration = "none";
        fetch("task/update", {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            method: "PATCH",

            body: JSON.stringify({
                title: title,
                progress: false
            })
        })
    }
}

function createWidget(type) {
    const widget = document.createElement('div');
    widget.classList.add('widget', type);

    const workspace = document.getElementById('workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    const widgetWidth = 200;
    const widgetHeight = 150;

    widget.style.left = `${(workspaceRect.width - widgetWidth) / 2}px`;
    widget.style.top = `${(workspaceRect.height - widgetHeight) / 2}px`;

    if (type === 'timer') {
        widget.innerHTML = `
            <div>Timer</div>
            <label>Hours: <input type="number" class="hoursInput" value="0" min="0"></label>
            <label>Minutes: <input type="number" class="minutesInput" value="0" min="0"></label>
            <label>Seconds: <input type="number" class="secondsInput" value="0" min="0"></label>
            <button onclick="startTimer(this)">Start</button>
            <button onclick="pauseTimer(this)">Pause</button>
            <button onclick="stopTimer(this)">Stop</button>
            <div class="timerDisplay">00:00:00</div>
        `;
        widget.dataset.remainingTime = 0;
        widget.dataset.timerInterval = '';
    } else if (type === 'note') {
        widget.innerHTML = `
            <textarea placeholder="Write a note..."></textarea>
        `;
    } else if (type === 'task-list') {
        widget.innerHTML = `
            <ul id="taskList">
                <input type="text" id="taskList" placeholder="My Task List">
                <div id="list"></div>
            </ul>
            <button onclick="addTask(this)">Add Task</button>
        `;
        let taskRows;
        let row;

        fetch("tasks").then(response => {
            return response.json();
        }).then(body => {
            taskRows = body["rows"];
            let taskList = document.getElementById("taskList");
            let html_str = "<table>";
            for (let i = 0; i < taskRows.length; i++) {
                row = taskRows[i];
                console.log(row);
                let due_date = row.due.split("T")[0];
                if (row.progress) {
                    // Reminder: All completed tasks are removed from db after checking the box
                    html_str += `<tr class="task-done" id="${row.id}">`;
                    html_str += `<td><input type="checkbox" checked onClick="strike(${row.id}, this)"/></td>`;
                    html_str += `<td class="title">${row.title}</td>`;
                    html_str += `<td class="due">due ${due_date}</td>`;
                    html_str += "</tr>";
                } else {
                    html_str += `<tr id="${row.id}">`;
                    html_str += `<td><input type="checkbox" id="progress" onClick="strike(${row.id}, this)"/></td>`;
                    html_str += `<td class="title">${row.title}</td>`;
                    html_str += `<td class="due">due ${due_date}</td>`;
                    html_str += "</tr>";
                }
            }
            html_str += "</table>"
            taskList.innerHTML = html_str;


        }).catch(error => {
            console.log(error);
        });
        console.log("Sent request GET /tasks"); 

    }

    let isDragging = false;
    let offsetX, offsetY;

    widget.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - widget.offsetLeft;
        offsetY = e.clientY - widget.offsetTop;
        widget.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            widget.style.left = `${e.clientX - offsetX}px`;
            widget.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        widget.style.cursor = 'grab';
    });

    workspace.appendChild(widget);
}



