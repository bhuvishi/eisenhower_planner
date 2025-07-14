document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const dailyDate = document.getElementById('daily-date');
    const weeklyDate = document.getElementById('weekly-date');
    const monthlyDate = document.getElementById('monthly-date');
    const weeklyGrid = document.getElementById('weekly-calendar-grid');
    const monthlyGrid = document.getElementById('monthly-calendar-grid');
    const undoNotification = document.getElementById('undo-notification');
    const undoBtn = document.getElementById('undo-btn');
    const quoteText = document.getElementById('quote-text');
    let recentlyDeleted = null;
    let draggedTask = null;

    const quotes = [
        "The secret of getting ahead is getting started.",
        "The best way to predict the future is to create it.",
        "Don't watch the clock; do what it does. Keep going.",
        "The future belongs to those who believe in the beauty of their dreams.",
        "Success is not final, failure is not fatal: it is the courage to continue that counts."
    ];

    function showRandomQuote() {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        quoteText.textContent = quotes[randomIndex];
    }

    function createTaskElement(taskText, quadrant, completed = false) {
        const task = document.createElement('div');
        task.classList.add('task');
        if (quadrant) {
            task.classList.add(quadrant);
        }
        if (completed) {
            task.classList.add('completed');
        }
        task.draggable = true;
        task.innerHTML = `
            <input type="checkbox" ${completed ? 'checked' : ''}>
            <span>${taskText}</span>
            <button class="delete-btn">X</button>
        `;
        task.addEventListener('dragstart', dragStart);
        task.querySelector('input[type="checkbox"]').addEventListener('change', toggleComplete);
        task.querySelector('.delete-btn').addEventListener('click', deleteTask);
        return task;
    }

    function addTask(type) {
        const input = document.getElementById(`${type}-task-input`);
        const taskText = input.value.trim();
        if (taskText === '') return;

        if (type === 'daily') {
            const task = createTaskElement(taskText, 'urgent-important');
            document.querySelector('#urgent-important .task-list').appendChild(task);
        } else {
            const dateInput = document.getElementById(`${type}-task-date`);
            const date = new Date(dateInput.value + 'T00:00:00'); // Fix for timezone issues
            const task = createTaskElement(taskText);

            if (type === 'weekly') {
                // Fix weekly task adding: map selected date to correct weekly grid day

                // Get the day number from first weeklyGrid header (e.g. "Mon 14")
                const firstDayDateStr = weeklyGrid.children[0].querySelector('b').textContent;
                const firstDayParts = firstDayDateStr.match(/\d+/);
                if (!firstDayParts) return; // safety check
                const firstDayNum = parseInt(firstDayParts[0], 10);

                // Get year and month from currently displayed week (using today's date as proxy)
                const today = new Date();
                const currentYear = today.getFullYear();
                const currentMonth = today.getMonth();

                // Monday date object of current week
                const mondayDate = new Date(currentYear, currentMonth, firstDayNum);

                // Calculate difference in days between selected date and Monday
                const diffDays = Math.floor((date - mondayDate) / (1000 * 60 * 60 * 24));

                // Check if selected date is within current week
                if (diffDays < 0 || diffDays > 6) {
                    alert("Selected date is out of the current week!");
                    return;
                }

                // Append task to correct day box in weekly grid
                weeklyGrid.children[diffDays].querySelector('.task-list').appendChild(task);
            } else {
                const dayIndex = date.getDate() - 1;
                monthlyGrid.children[dayIndex].querySelector('.task-list').appendChild(task);
            }
        }

        input.value = '';
        saveTasks();
    }

    window.addTask = addTask;

    function allowDrop(event) {
        event.preventDefault();
    }

    window.allowDrop = allowDrop;

    function dragStart(event) {
        draggedTask = event.target;
        event.dataTransfer.setData('text/plain', draggedTask.id);
        event.target.classList.add('dragging');
    }

    function drop(event) {
        event.preventDefault();
        const dropzone = event.target.closest('.task-list');
        if (dropzone && draggedTask) {
            const quadrant = dropzone.closest('.quadrant');
            if (quadrant) {
                draggedTask.className = 'task ' + quadrant.id;
            }
            dropzone.appendChild(draggedTask);
            draggedTask.classList.remove('dragging');
            draggedTask = null;
            saveTasks();
        }
    }

    window.drop = drop;

    function toggleComplete(event) {
        event.target.closest('.task').classList.toggle('completed');
        saveTasks();
    }

    function deleteTask(event) {
        const task = event.target.closest('.task');
        recentlyDeleted = {
            element: task,
            parent: task.parentElement
        };
        task.remove();
        saveTasks();
        undoNotification.classList.remove('hidden');
        setTimeout(() => undoNotification.classList.add('hidden'), 5000);
    }

    undoBtn.addEventListener('click', () => {
        if (recentlyDeleted) {
            recentlyDeleted.parent.appendChild(recentlyDeleted.element);
            recentlyDeleted = null;
            undoNotification.classList.add('hidden');
            saveTasks();
        }
    });

    function saveTasks() {
        const dailyTasks = {};
        document.querySelectorAll('#daily-planner .quadrant').forEach(q => {
            dailyTasks[q.id] = Array.from(q.querySelectorAll('.task')).map(t => ({
                text: t.querySelector('span').textContent,
                quadrant: t.classList[1],
                completed: t.classList.contains('completed')
            }));
        });
        localStorage.setItem('dailyTasks', JSON.stringify(dailyTasks));

        const weeklyTasks = {};
        Array.from(weeklyGrid.children).forEach((day, index) => {
            weeklyTasks[index] = Array.from(day.querySelectorAll('.task')).map(t => ({
                text: t.querySelector('span').textContent,
                completed: t.classList.contains('completed')
            }));
        });
        localStorage.setItem('weeklyTasks', JSON.stringify(weeklyTasks));

        const monthlyTasks = {};
        Array.from(monthlyGrid.children).forEach((day, index) => {
            monthlyTasks[index] = Array.from(day.querySelectorAll('.task')).map(t => ({
                text: t.querySelector('span').textContent,
                completed: t.classList.contains('completed')
            }));
        });
        localStorage.setItem('monthlyTasks', JSON.stringify(monthlyTasks));
    }

    function loadTasks() {
        const dailyTasks = JSON.parse(localStorage.getItem('dailyTasks'));
        if (dailyTasks) {
            for (const id in dailyTasks) {
                const quadrant = document.getElementById(id);
                dailyTasks[id].forEach(taskData => {
                    const task = createTaskElement(taskData.text, taskData.quadrant, taskData.completed);
                    quadrant.querySelector('.task-list').appendChild(task);
                });
            }
        }

        const weeklyTasks = JSON.parse(localStorage.getItem('weeklyTasks'));
        if (weeklyTasks) {
            for (const day in weeklyTasks) {
                weeklyTasks[day].forEach(taskData => {
                    const task = createTaskElement(taskData.text, null, taskData.completed);
                    weeklyGrid.children[day].querySelector('.task-list').appendChild(task);
                });
            }
        }

        const monthlyTasks = JSON.parse(localStorage.getItem('monthlyTasks'));
        if (monthlyTasks) {
            for (const day in monthlyTasks) {
                monthlyTasks[day].forEach(taskData => {
                    const task = createTaskElement(taskData.text, null, taskData.completed);
                    monthlyGrid.children[day].querySelector('.task-list').appendChild(task);
                });
            }
        }
    }

    function initDates() {
        const today = new Date();
        dailyDate.textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        weeklyDate.textContent = `Week of ${today.toLocaleDateString()}`;
        monthlyDate.textContent = today.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    function initCalendars() {
        initDates();

        weeklyGrid.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const day = document.createElement('div');
            const date = new Date();
            date.setDate(date.getDate() - date.getDay() + i);
            day.innerHTML = `<b>${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}</b><div class="task-list"></div>`;
            weeklyGrid.appendChild(day);
        }

        monthlyGrid.innerHTML = '';
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        for (let i = 1; i <= monthEnd.getDate(); i++) {
            const day = document.createElement('div');
            const date = new Date(today.getFullYear(), today.getMonth(), i);
            day.innerHTML = `<b>${i} ${date.toLocaleDateString('en-US', { weekday: 'short' })}</b><div class="task-list"></div>`;
            monthlyGrid.appendChild(day);
        }
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }

    function openTab(event, tabName) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        event.currentTarget.classList.add('active');
    }

    window.openTab = openTab;

    showRandomQuote();
    initCalendars();
    loadTasks();
});
