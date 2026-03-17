const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const totalCount = document.getElementById('total-count');
const leftCount = document.getElementById('left-count');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const todayLabel = document.getElementById('today-label');
const todayDate = document.getElementById('today-date');
const emptyState = document.getElementById('empty-state');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const listButtons = document.querySelectorAll('.list-btn');
const taskDue = document.getElementById('task-due');
const taskPriority = document.getElementById('task-priority');
const taskListSelect = document.getElementById('task-list-select');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

const STORAGE_KEY = 'momentum_tasks_v1';
let tasks = [];
let currentFilter = 'all';
let currentList = 'all';
let searchQuery = '';
let sortMode = 'newest';

init();

addTaskBtn.addEventListener('click', handleAddTask);
taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleAddTask();
    }
});

clearCompletedBtn.addEventListener('click', () => {
    tasks = tasks.filter((task) => !task.completed);
    persist();
    render();
});

searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    render();
});

sortSelect.addEventListener('change', (event) => {
    sortMode = event.target.value;
    render();
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        filterButtons.forEach((btn) => {
            btn.classList.remove('is-active');
            btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('is-active');
        button.setAttribute('aria-selected', 'true');
        currentFilter = button.dataset.filter;
        render();
    });
});

listButtons.forEach((button) => {
    button.addEventListener('click', () => {
        listButtons.forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');
        currentList = button.dataset.list;
        render();
    });
});

function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    tasks = saved ? JSON.parse(saved) : [];
    tasks = tasks.map((task) => ({
        id: task.id || crypto.randomUUID(),
        text: task.text || '',
        completed: Boolean(task.completed),
        createdAt: task.createdAt || Date.now(),
        dueDate: task.dueDate || null,
        priority: task.priority || 'medium',
        list: task.list || 'general'
    }));
    updateToday();
    render();
}

function handleAddTask() {
    const taskText = taskInput.value.trim();
    if (!taskText) {
        taskInput.focus();
        return;
    }

    tasks.unshift({
        id: crypto.randomUUID(),
        text: taskText,
        completed: false,
        createdAt: Date.now(),
        dueDate: taskDue.value ? taskDue.value : null,
        priority: taskPriority.value || 'medium',
        list: taskListSelect.value || 'general'
    });
    taskInput.value = '';
    taskDue.value = '';
    taskPriority.value = 'medium';
    taskListSelect.value = 'general';
    persist();
    render();
}

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function render() {
    let filteredTasks = tasks.filter((task) => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });

    if (currentList !== 'all') {
        filteredTasks = filteredTasks.filter((task) => task.list === currentList);
    }

    if (searchQuery) {
        filteredTasks = filteredTasks.filter((task) =>
            task.text.toLowerCase().includes(searchQuery)
        );
    }

    filteredTasks = sortTasks(filteredTasks);

    taskList.innerHTML = '';
    filteredTasks.forEach((task) => {
        taskList.appendChild(createTaskElement(task));
    });

    const total = tasks.length;
    const left = tasks.filter((task) => !task.completed).length;
    const completed = total - left;
    totalCount.textContent = total;
    leftCount.textContent = left;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${progress}% done`;

    if (filteredTasks.length === 0) {
        emptyState.classList.add('is-visible');
        if (searchQuery) {
            emptyState.textContent = 'No matching tasks found.';
        } else if (currentList !== 'all') {
            emptyState.textContent = `No tasks in ${titleCase(currentList)} yet.`;
        } else {
            emptyState.textContent =
                currentFilter === 'completed'
                    ? 'Nothing completed yet. Finish one task.'
                    : currentFilter === 'active'
                    ? 'You are clear. Add something new.'
                    : 'No tasks yet. Add your first win.';
        }
    } else {
        emptyState.classList.remove('is-visible');
    }
}

function createTaskElement(task) {
    const taskItem = document.createElement('li');
    taskItem.className = 'task-item';
    if (task.completed) taskItem.classList.add('completed');

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'task-toggle';
    toggleBtn.setAttribute('aria-label', 'Mark task complete');
    if (task.completed) {
        toggleBtn.classList.add('is-checked');
        toggleBtn.textContent = 'v';
    }
    toggleBtn.addEventListener('click', () => toggleComplete(task.id));

    const content = document.createElement('div');
    content.className = 'task-main';

    const taskTextElement = document.createElement('span');
    taskTextElement.className = 'task-text';
    taskTextElement.textContent = task.text;
    taskTextElement.setAttribute('role', 'textbox');
    taskTextElement.setAttribute('contenteditable', 'true');
    taskTextElement.setAttribute('aria-label', 'Edit task');
    taskTextElement.addEventListener('blur', (event) => {
        const nextText = event.target.textContent.trim();
        if (!nextText) {
            deleteTask(task.id);
            return;
        }
        updateTask(task.id, { text: nextText });
    });

    const details = document.createElement('div');
    details.className = 'task-details';

    if (task.dueDate) {
        const due = document.createElement('span');
        const label = formatDueDate(task.dueDate);
        due.className = 'due';
        due.textContent = `Due ${label}`;
        if (isOverdue(task.dueDate) && !task.completed) {
            due.classList.add('overdue');
        }
        details.appendChild(due);
    }

    const badge = document.createElement('span');
    badge.className = `badge ${task.priority}`;
    badge.textContent = task.priority;
    details.appendChild(badge);

    const listChip = document.createElement('span');
    listChip.className = 'list-chip';
    listChip.textContent = titleCase(task.list);
    details.appendChild(listChip);

    content.appendChild(taskTextElement);
    content.appendChild(details);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'task-btn secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
        taskTextElement.focus();
        document.execCommand('selectAll', false, null);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    taskItem.appendChild(toggleBtn);
    taskItem.appendChild(content);
    taskItem.appendChild(actions);

    return taskItem;
}

function toggleComplete(id) {
    tasks = tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
    );
    persist();
    render();
}

function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    persist();
    render();
}

function updateTask(id, updates) {
    tasks = tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
    );
    persist();
    render();
}

function updateToday() {
    const today = new Date();
    todayLabel.textContent = today.toLocaleDateString(undefined, { weekday: 'long' });
    todayDate.textContent = today.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    });
}

function formatDueDate(dueDate) {
    const due = new Date(`${dueDate}T00:00:00`);
    return due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${dueDate}T00:00:00`);
    return due < today;
}

function sortTasks(list) {
    const sorted = [...list];
    if (sortMode === 'oldest') {
        return sorted.sort((a, b) => a.createdAt - b.createdAt);
    }
    if (sortMode === 'due') {
        return sorted.sort((a, b) => {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }
    if (sortMode === 'priority') {
        const rank = { high: 0, medium: 1, low: 2 };
        return sorted.sort((a, b) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1));
    }
    return sorted.sort((a, b) => b.createdAt - a.createdAt);
}

function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
