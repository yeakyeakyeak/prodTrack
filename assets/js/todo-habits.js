// ===== ТРЕКЕР ЗАДАЧ И ПРИВЫЧЕК =====

class TaskManager {
    constructor() {
        this.tasks = storage.get('tasks', []);
        this.habits = storage.get('habits', []);
        this.habitProgress = storage.get('habitProgress', {});
        this.goals = storage.get('goals', []);
        this.activities = storage.get('activities', []);

        this.init();
    }

    init() {
        // Загружаем данные и рендерим
        this.renderTasks();
        this.renderHabits();
        this.renderWeekCalendar();
        this.updateStats();

        // Инициализируем обработчики событий
        this.initEventHandlers();

        // Загружаем календарь
        this.initCalendar();
    }

    // ===== ЗАДАЧИ =====

    addTask(taskData) {
        const task = {
            id: generateId(),
            text: taskData.text,
            category: taskData.category,
            priority: taskData.priority,
            date: taskData.date,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        storage.set('tasks', this.tasks);

        // Добавляем активность
        this.addActivity(`Добавлена задача "${task.text}"`);

        this.renderTasks();
        this.updateStats();

        showNotification(`Задача "${task.text}" добавлена`, 'success');

        return task;
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : undefined;

            storage.set('tasks', this.tasks);

            // Добавляем активность
            this.addActivity(`Задача "${task.text}" ${task.completed ? 'выполнена' : 'возобновлена'}`);

            this.renderTasks();
            this.updateStats();

            showNotification(`Задача ${task.completed ? 'выполнена' : 'возобновлена'}`, 'success');
        }
    }

    deleteTask(id) {
        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            const task = this.tasks[taskIndex];
            this.tasks.splice(taskIndex, 1);
            storage.set('tasks', this.tasks);

            // Добавляем активность
            this.addActivity(`Удалена задача "${task.text}"`);

            this.renderTasks();
            this.updateStats();

            showNotification('Задача удалена', 'success');
        }
    }

    filterTasks(filterType) {
        const today = formatDate();

        switch (filterType) {
            case 'active':
                return this.tasks.filter(task => !task.completed);
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'today':
                return this.tasks.filter(task => task.date === today);
            default:
                return this.tasks;
        }
    }

    searchTasks(query) {
        if (!query.trim()) return this.tasks;

        const searchLower = query.toLowerCase();
        return this.tasks.filter(task =>
            task.text.toLowerCase().includes(searchLower) ||
            task.category.toLowerCase().includes(searchLower)
        );
    }

    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        const emptyState = document.getElementById('empty-tasks');

        if (!tasksList) return;

        // Получаем текущий фильтр и поисковый запрос
        const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
        const searchQuery = document.getElementById('task-search')?.value || '';

        // Фильтруем задачи
        let tasksToShow = this.filterTasks(activeFilter);

        if (searchQuery) {
            tasksToShow = this.searchTasks(searchQuery);
        }

        // Очищаем список
        tasksList.innerHTML = '';

        if (tasksToShow.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        // Рендерим задачи
        tasksToShow.forEach(task => {
            const taskElement = this.createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskElement.setAttribute('data-id', task.id);

        // Определяем цвет приоритета
        let priorityColor = '';
        switch (task.priority) {
            case 'high': priorityColor = '#ef4444'; break;
            case 'medium': priorityColor = '#f59e0b'; break;
            case 'low': priorityColor = '#10b981'; break;
        }

        // Определяем иконку категории
        let categoryIcon = '🔶';
        switch (task.category) {
            case 'work': categoryIcon = '🖥️'; break;
            case 'home': categoryIcon = '🏠'; break;
            case 'health': categoryIcon = '💪'; break;
            case 'learning': categoryIcon = '📚'; break;
        }

        taskElement.innerHTML = `
            <div class="task-checkbox">
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
            </div>
            <div class="task-content">
                <div class="task-text">${task.text}</div>
                <div class="task-meta">
                    <span class="task-category">${categoryIcon} ${task.category}</span>
                    <span class="task-date">📅 ${task.date}</span>
                    <span class="task-priority" style="color: ${priorityColor}">● ${task.priority}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-delete" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Добавляем обработчики событий
        const checkbox = taskElement.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleTask(task.id);
        });

        const deleteBtn = taskElement.querySelector('.task-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Удалить задачу?')) {
                this.deleteTask(task.id);
            }
        });

        return taskElement;
    }

    // ===== ПРИВЫЧКИ =====

    addHabit(habitData) {
        const habit = {
            id: generateId(),
            name: habitData.name,
            frequency: habitData.frequency,
            color: this.getRandomColor(),
            streak: 0,
            createdAt: new Date().toISOString()
        };

        this.habits.unshift(habit);
        storage.set('habits', this.habits);

        // Инициализируем прогресс для привычки
        if (!this.habitProgress[habit.id]) {
            this.habitProgress[habit.id] = {};
            storage.set('habitProgress', this.habitProgress);
        }

        // Добавляем активность
        this.addActivity(`Добавлена привычка "${habit.name}"`);

        this.renderHabits();
        this.updateStats();

        showNotification(`Привычка "${habit.name}" добавлена`, 'success');

        return habit;
    }

    toggleHabit(habitId, date = formatDate()) {
        if (!this.habitProgress[habitId]) {
            this.habitProgress[habitId] = {};
        }

        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        // Переключаем выполнение на дату
        this.habitProgress[habitId][date] = !this.habitProgress[habitId][date];

        // Обновляем серию
        this.updateHabitStreak(habitId);

        storage.set('habitProgress', this.habitProgress);
        storage.set('habits', this.habits);

        // Добавляем активность
        this.addActivity(`Привычка "${habit.name}" ${this.habitProgress[habitId][date] ? 'отмечена' : 'сброшена'}`);

        this.renderHabits();
        this.renderWeekCalendar();
        this.updateStats();
    }

    updateHabitStreak(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const progress = this.habitProgress[habitId] || {};
        let streak = 0;
        let currentDate = new Date();

        // Проверяем последовательные дни
        while (streak < 365) { // Максимум годовая серия
            const dateStr = formatDate(currentDate);
            if (progress[dateStr]) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        habit.streak = streak;
    }

    deleteHabit(habitId) {
        const habitIndex = this.habits.findIndex(h => h.id === habitId);
        if (habitIndex > -1) {
            const habit = this.habits[habitIndex];
            this.habits.splice(habitIndex, 1);

            delete this.habitProgress[habitId];

            storage.set('habits', this.habits);
            storage.set('habitProgress', this.habitProgress);

            // Добавляем активность
            this.addActivity(`Удалена привычка "${habit.name}"`);

            this.renderHabits();
            this.updateStats();

            showNotification('Привычка удалена', 'success');
        }
    }

    renderHabits() {
        const habitsList = document.getElementById('habits-list');
        const emptyState = document.getElementById('empty-habits');

        if (!habitsList) return;

        habitsList.innerHTML = '';

        if (this.habits.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        this.habits.forEach(habit => {
            const habitElement = this.createHabitElement(habit);
            habitsList.appendChild(habitElement);
        });
    }

    createHabitElement(habit) {
        const habitElement = document.createElement('div');
        habitElement.className = 'habit-item';
        habitElement.setAttribute('data-id', habit.id);

        const today = formatDate();
        const isCompletedToday = this.habitProgress[habit.id]?.[today] || false;
        const weekProgress = this.getHabitWeekProgress(habit.id);

        habitElement.innerHTML = `
            <div class="habit-header">
                <div class="habit-color" style="background-color: ${habit.color}"></div>
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-meta">
                        <span class="habit-frequency">${this.getFrequencyText(habit.frequency)}</span>
                        <span class="habit-streak">🔥 ${habit.streak} дней</span>
                    </div>
                </div>
            </div>
            <div class="habit-progress">
                <div class="week-progress">
                    ${this.getWeekProgressHTML(habit.id)}
                </div>
                <div class="habit-actions">
                    <button class="habit-toggle ${isCompletedToday ? 'completed' : ''}">
                        ${isCompletedToday ? '<i class="fas fa-check"></i> Сегодня выполнено' : 'Отметить сегодня'}
                    </button>
                    <button class="habit-delete" title="Удалить привычку">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Обработчики событий
        const toggleBtn = habitElement.querySelector('.habit-toggle');
        toggleBtn.addEventListener('click', () => {
            this.toggleHabit(habit.id);
        });

        const deleteBtn = habitElement.querySelector('.habit-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Удалить привычку?')) {
                this.deleteHabit(habit.id);
            }
        });

        return habitElement;
    }

    getHabitWeekProgress(habitId) {
        const progress = this.habitProgress[habitId] || {};
        const weekDays = this.getWeekDates();
        let completed = 0;

        weekDays.forEach(date => {
            if (progress[date]) completed++;
        });

        return {
            completed,
            total: weekDays.length,
            percent: Math.round((completed / weekDays.length) * 100)
        };
    }

    getWeekProgressHTML(habitId) {
        const weekDays = this.getWeekDates();
        const progress = this.habitProgress[habitId] || {};
        let html = '';

        weekDays.forEach(date => {
            const dayName = new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' });
            const isCompleted = progress[date] || false;

            html += `
                <div class="day-cell ${isCompleted ? 'completed' : ''}" data-date="${date}">
                    <div class="day-name">${dayName}</div>
                    <div class="day-check">${isCompleted ? '✓' : ''}</div>
                </div>
            `;
        });

        return html;
    }

    renderWeekCalendar() {
        const weekCalendar = document.getElementById('week-calendar');
        if (!weekCalendar) return;

        weekCalendar.innerHTML = `
            <div class="week-days">
                ${this.getWeekDaysHTML()}
            </div>
            <div class="week-habits">
                ${this.getHabitsWeekView()}
            </div>
        `;
    }

    getWeekDaysHTML() {
        const weekDates = this.getWeekDates();
        let html = '';

        weekDates.forEach(date => {
            const dayName = new Date(date).toLocaleDateString('ru-RU', { weekday: 'short' });
            const dayNumber = new Date(date).getDate();

            html += `
                <div class="week-day">
                    <div class="day-name">${dayName}</div>
                    <div class="day-number">${dayNumber}</div>
                </div>
            `;
        });

        return html;
    }

    getHabitsWeekView() {
        let html = '';

        this.habits.forEach(habit => {
            const weekDates = this.getWeekDates();
            const progress = this.habitProgress[habit.id] || {};

            html += `<div class="week-habit-row">`;

            weekDates.forEach(date => {
                const isCompleted = progress[date] || false;
                html += `
                    <div class="week-habit-cell ${isCompleted ? 'completed' : ''}" 
                         data-habit="${habit.id}" 
                         data-date="${date}">
                        <div class="habit-dot" style="background-color: ${habit.color}"></div>
                    </div>
                `;
            });

            html += `<span class="habit-name">${habit.name}</span></div>`;
        });

        return html;
    }

    // ===== КАЛЕНДАРЬ =====

    initCalendar() {
        this.currentMonth = new Date();
        this.renderCalendar();

        // Навигация по месяцам
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');

        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
                this.renderCalendar();
            });
        }
    }

    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const currentMonth = document.getElementById('current-month');

        if (!calendar || !currentMonth) return;

        // Обновляем заголовок месяца
        currentMonth.textContent = this.currentMonth.toLocaleDateString('ru-RU', {
            month: 'long',
            year: 'numeric'
        });

        // Генерируем календарь
        calendar.innerHTML = this.generateCalendarHTML();

        // Добавляем обработчики для дней
        const dayCells = calendar.querySelectorAll('.calendar-day');
        dayCells.forEach(cell => {
            const date = cell.getAttribute('data-date');
            cell.addEventListener('click', () => {
                this.selectCalendarDate(date);
            });
        });
    }

    generateCalendarHTML() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        const firstDayIndex = firstDay.getDay();
        const lastDayIndex = lastDay.getDay();

        let html = '';

        // Пустые ячейки в начале
        for (let i = 0; i < (firstDayIndex === 0 ? 6 : firstDayIndex - 1); i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Дни месяца
        const today = formatDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDate(date);
            const hasTasks = this.getTasksForDate(dateStr).length > 0;
            const hasHabits = this.getHabitsForDate(dateStr).length > 0;
            const isToday = dateStr === today;

            let className = 'calendar-day';
            if (isToday) className += ' today';
            if (hasTasks) className += ' has-tasks';
            if (hasHabits) className += ' has-habits';

            html += `
                <div class="${className}" data-date="${dateStr}">
                    <div class="day-number">${day}</div>
                    <div class="day-indicators">
                        ${hasTasks ? '<span class="task-indicator">●</span>' : ''}
                        ${hasHabits ? '<span class="habit-indicator">○</span>' : ''}
                    </div>
                </div>
            `;
        }

        // Пустые ячейки в конце
        const totalCells = 42; // 6 недель * 7 дней
        const filledCells = (firstDayIndex === 0 ? 6 : firstDayIndex - 1) + daysInMonth;
        const emptyEndCells = totalCells - filledCells;

        for (let i = 0; i < emptyEndCells; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        return html;
    }

    selectCalendarDate(date) {
        const selectedDate = document.getElementById('selected-date');
        const dayEvents = document.getElementById('day-events');

        if (!selectedDate || !dayEvents) return;

        const formattedDate = new Date(date).toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        selectedDate.textContent = formattedDate;

        // Получаем задачи и привычки на эту дату
        const tasks = this.getTasksForDate(date);
        const habits = this.getHabitsForDate(date);

        let eventsHTML = '';

        if (tasks.length === 0 && habits.length === 0) {
            eventsHTML = '<div class="no-events">Нет событий на этот день</div>';
        } else {
            if (tasks.length > 0) {
                eventsHTML += '<h4>Задачи:</h4><ul class="day-tasks">';
                tasks.forEach(task => {
                    eventsHTML += `
                        <li class="${task.completed ? 'completed' : ''}">
                            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                   onchange="taskManager.toggleTask('${task.id}')">
                            ${task.text}
                        </li>
                    `;
                });
                eventsHTML += '</ul>';
            }

            if (habits.length > 0) {
                eventsHTML += '<h4>Привычки:</h4><ul class="day-habits">';
                habits.forEach(habit => {
                    const isCompleted = this.habitProgress[habit.id]?.[date] || false;
                    eventsHTML += `
                        <li class="${isCompleted ? 'completed' : ''}">
                            <input type="checkbox" ${isCompleted ? 'checked' : ''} 
                                   onchange="taskManager.toggleHabit('${habit.id}', '${date}')">
                            ${habit.name}
                        </li>
                    `;
                });
                eventsHTML += '</ul>';
            }
        }

        dayEvents.innerHTML = eventsHTML;
    }

    // ===== УТИЛИТЫ =====

    getWeekDates() {
        const today = new Date();
        const currentDay = today.getDay();
        const startDate = new Date(today);

        // Начало недели с понедельника
        startDate.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));

        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            weekDates.push(formatDate(date));
        }

        return weekDates;
    }

    getTasksForDate(date) {
        return this.tasks.filter(task => task.date === date);
    }

    getHabitsForDate(date) {
        // Для привычек проверяем, должна ли привычка выполняться в этот день
        return this.habits.filter(habit => {
            const progress = this.habitProgress[habit.id] || {};
            return progress.hasOwnProperty(date);
        });
    }

    getFrequencyText(frequency) {
        switch (frequency) {
            case 'daily': return 'Ежедневно';
            case 'weekly': return '3 раза в неделю';
            case 'weekdays': return 'По будням';
            default: return frequency;
        }
    }

    getRandomColor() {
        const colors = [
            '#4f46e5', '#10b981', '#f59e0b', '#ef4444',
            '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // ===== СТАТИСТИКА =====

    updateStats() {
        // Обновляем статистику задач
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.completed).length;
        const activeTasks = totalTasks - completedTasks;

        const today = formatDate();
        const todayTasks = this.tasks.filter(t => t.date === today).length;

        // Обновляем DOM элементы
        this.updateElement('total-tasks', totalTasks);
        this.updateElement('completed-tasks', completedTasks);
        this.updateElement('active-tasks', activeTasks);
        this.updateElement('today-tasks', todayTasks);

        // Обновляем статистику привычек
        const activeHabits = this.habits.length;
        const todayHabits = this.habits.filter(habit => {
            return this.habitProgress[habit.id]?.[today] || false;
        }).length;

        // Рассчитываем успешность (процент выполненных привычек сегодня)
        const successRate = activeHabits > 0 ?
            Math.round((todayHabits / activeHabits) * 100) : 0;

        this.updateElement('active-habits', activeHabits);
        this.updateElement('today-habits', todayHabits);
        this.updateElement('success-rate', `${successRate}%`);

        // Обновляем продуктивность
        const totalTodayItems = todayTasks + activeHabits;
        const completedTodayItems = this.tasks.filter(t =>
            t.date === today && t.completed
        ).length + todayHabits;

        const productivity = totalTodayItems > 0 ?
            Math.round((completedTodayItems / totalTodayItems) * 100) : 0;

        this.updateElement('productivity', `${productivity}%`);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    addActivity(text) {
        const activity = {
            id: generateId(),
            text,
            time: new Date().toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            timestamp: new Date().toISOString()
        };

        this.activities.unshift(activity);

        // Ограничиваем количество записей
        if (this.activities.length > 10) {
            this.activities = this.activities.slice(0, 10);
        }

        storage.set('activities', this.activities);

        // Обновляем список активностей в UI
        this.renderActivities();
    }

    renderActivities() {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        activityList.innerHTML = '';

        this.activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <span>${activity.text}</span>
                <span class="activity-time">${activity.time}</span>
            `;
            activityList.appendChild(activityItem);
        });
    }

    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

    initEventHandlers() {
        // Добавление задачи
        const addTaskBtn = document.getElementById('add-task-btn');
        const taskInput = document.getElementById('task-input');

        if (addTaskBtn && taskInput) {
            addTaskBtn.addEventListener('click', () => {
                this.handleAddTask();
            });

            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddTask();
                }
            });
        }

        // Добавление привычки
        const addHabitBtn = document.getElementById('add-habit-btn');
        const habitInput = document.getElementById('habit-input');

        if (addHabitBtn && habitInput) {
            addHabitBtn.addEventListener('click', () => {
                this.handleAddHabit();
            });

            habitInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddHabit();
                }
            });
        }

        // Поиск задач
        const taskSearch = document.getElementById('task-search');
        if (taskSearch) {
            taskSearch.addEventListener('input', () => {
                this.renderTasks();
            });
        }

        // Фильтры задач
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.renderTasks();
            });
        });

        // Цели
        const addGoalBtn = document.getElementById('add-goal-btn');
        const saveGoalBtn = document.getElementById('save-goal-btn');
        const goalModal = document.getElementById('goal-modal');

        if (addGoalBtn && goalModal) {
            addGoalBtn.addEventListener('click', () => {
                goalModal.classList.add('active');
            });
        }

        if (saveGoalBtn) {
            saveGoalBtn.addEventListener('click', () => {
                this.handleAddGoal();
            });
        }
    }

    handleAddTask() {
        const taskInput = document.getElementById('task-input');
        const taskCategory = document.getElementById('task-category');
        const taskPriority = document.getElementById('task-priority');
        const taskDate = document.getElementById('task-date');

        const text = taskInput.value.trim();
        if (!text) {
            showNotification('Введите текст задачи', 'error');
            return;
        }

        this.addTask({
            text,
            category: taskCategory.value,
            priority: taskPriority.value,
            date: taskDate.value
        });

        // Очищаем поле ввода
        taskInput.value = '';
        taskInput.focus();
    }

    handleAddHabit() {
        const habitInput = document.getElementById('habit-input');
        const habitFrequency = document.getElementById('habit-frequency');

        const name = habitInput.value.trim();
        if (!name) {
            showNotification('Введите название привычки', 'error');
            return;
        }

        this.addHabit({
            name,
            frequency: habitFrequency.value
        });

        // Очищаем поле ввода
        habitInput.value = '';
        habitInput.focus();
    }

    handleAddGoal() {
        const goalTitle = document.getElementById('goal-title');
        const goalType = document.getElementById('goal-type');
        const goalTarget = document.getElementById('goal-target');
        const goalModal = document.getElementById('goal-modal');

        const title = goalTitle.value.trim();
        const target = parseInt(goalTarget.value);

        if (!title || !target || target < 1) {
            showNotification('Заполните все поля правильно', 'error');
            return;
        }

        const goal = {
            id: generateId(),
            title,
            type: goalType.value,
            target,
            current: 0,
            createdAt: new Date().toISOString()
        };

        this.goals.push(goal);
        storage.set('goals', this.goals);

        // Закрываем модальное окно и очищаем поля
        goalModal.classList.remove('active');
        goalTitle.value = '';
        goalTarget.value = '';

        showNotification('Цель добавлена', 'success');

        // Обновляем UI целей
        this.renderQuickGoals();
    }

    renderQuickGoals() {
        const quickGoals = document.querySelector('.quick-goals');
        if (!quickGoals) return;

        quickGoals.innerHTML = '';

        this.goals.slice(0, 2).forEach(goal => {
            const percent = Math.round((goal.current / goal.target) * 100);

            const goalItem = document.createElement('div');
            goalItem.className = 'goal-item';
            goalItem.innerHTML = `
                <span class="goal-text">${goal.title}</span>
                <div class="goal-progress">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                </div>
                <span class="goal-percent">${percent}%</span>
            `;
            quickGoals.appendChild(goalItem);
        });
    }
}

// Инициализация при загрузке страницы
let taskManager;

document.addEventListener('DOMContentLoaded', function () {
    taskManager = new TaskManager();
});

// Экспортируем для использования в HTML
window.taskManager = taskManager;