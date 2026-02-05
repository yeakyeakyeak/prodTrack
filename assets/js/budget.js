// ===== БЮДЖЕТНЫЙ ТРЕКЕР =====

class BudgetTracker {
    constructor() {
        this.expenses = storage.get('expenses', []);
        this.savingsGoals = storage.get('savingsGoals', []);
        this.balance = storage.get('balance', 25000);
        this.savings = storage.get('savings', 0);
        this.insights = [];

        this.init();
    }

    init() {
        this.renderExpenses();
        this.renderGoals();
        this.updateBalance();
        this.updateChart();
        this.generateInsights();

        this.initEventHandlers();

        // Устанавливаем сегодняшнюю дату
        const expenseDate = document.getElementById('expense-date');
        if (expenseDate && !expenseDate.value) {
            expenseDate.value = formatDate();
        }
    }

    // ===== РАСХОДЫ =====

    addExpense(expenseData) {
        const expense = {
            id: generateId(),
            amount: parseFloat(expenseData.amount),
            category: expenseData.category,
            date: expenseData.date,
            description: expenseData.description,
            createdAt: new Date().toISOString()
        };

        // Проверяем, хватает ли средств
        if (expense.amount > this.balance) {
            showNotification('Недостаточно средств на балансе', 'error');
            return;
        }

        this.expenses.unshift(expense);
        this.balance -= expense.amount;

        storage.set('expenses', this.expenses);
        storage.set('balance', this.balance);

        this.renderExpenses();
        this.updateBalance();
        this.updateChart();
        this.generateInsights();

        showNotification(`Расход ${formatCurrency(expense.amount)} добавлен`, 'success');

        return expense;
    }

    deleteExpense(expenseId) {
        const expenseIndex = this.expenses.findIndex(e => e.id === expenseId);
        if (expenseIndex > -1) {
            const expense = this.expenses[expenseIndex];

            // Возвращаем средства на баланс
            this.balance += expense.amount;

            this.expenses.splice(expenseIndex, 1);

            storage.set('expenses', this.expenses);
            storage.set('balance', this.balance);

            this.renderExpenses();
            this.updateBalance();
            this.updateChart();
            this.generateInsights();

            showNotification('Расход удален', 'success');
        }
    }

    getExpensesByPeriod(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return this.expenses;
        }

        return this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate;
        });
    }

    getCategoryStats() {
        const categories = {
            food: { name: '🍔 Еда', total: 0, color: '#4CAF50' },
            transport: { name: '🚗 Транспорт', total: 0, color: '#2196F3' },
            utilities: { name: '🏠 Коммуналка', total: 0, color: '#FF9800' },
            entertainment: { name: '🎬 Развлечения', total: 0, color: '#9C27B0' },
            shopping: { name: '🛍️ Покупки', total: 0, color: '#E91E63' },
            health: { name: '💊 Здоровье', total: 0, color: '#00BCD4' },
            education: { name: '📚 Образование', total: 0, color: '#8BC34A' },
            other: { name: '🔶 Другое', total: 0, color: '#607D8B' }
        };

        const periodSelect = document.getElementById('period-select');
        const period = periodSelect ? periodSelect.value : 'month';
        const periodExpenses = this.getExpensesByPeriod(period);

        periodExpenses.forEach(expense => {
            if (categories[expense.category]) {
                categories[expense.category].total += expense.amount;
            }
        });

        // Фильтруем категории с ненулевыми суммами
        const result = Object.values(categories).filter(cat => cat.total > 0);

        // Сортируем по убыванию
        result.sort((a, b) => b.total - a.total);

        return result;
    }

    renderExpenses() {
        const expensesContainer = document.getElementById('expenses-container');
        const emptyState = document.getElementById('empty-expenses');

        if (!expensesContainer) return;

        expensesContainer.innerHTML = '';

        const periodSelect = document.getElementById('period-select');
        const period = periodSelect ? periodSelect.value : 'week';
        const periodExpenses = this.getExpensesByPeriod(period);

        if (periodExpenses.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        periodExpenses.forEach(expense => {
            const expenseElement = this.createExpenseElement(expense);
            expensesContainer.appendChild(expenseElement);
        });
    }

    createExpenseElement(expense) {
        const expenseElement = document.createElement('div');
        expenseElement.className = 'expense-item';
        expenseElement.setAttribute('data-id', expense.id);

        // Получаем информацию о категории
        const categoryInfo = this.getCategoryInfo(expense.category);

        expenseElement.innerHTML = `
            <div class="expense-icon" style="background-color: ${categoryInfo.color}">
                ${categoryInfo.icon}
            </div>
            <div class="expense-details">
                <div class="expense-description">${expense.description || 'Без описания'}</div>
                <div class="expense-meta">
                    <span class="expense-category">${categoryInfo.name}</span>
                    <span class="expense-date">${new Date(expense.date).toLocaleDateString('ru-RU')}</span>
                </div>
            </div>
            <div class="expense-amount">
                -${formatCurrency(expense.amount)}
                <button class="expense-delete" title="Удалить">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Обработчик удаления
        const deleteBtn = expenseElement.querySelector('.expense-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Удалить этот расход?')) {
                this.deleteExpense(expense.id);
            }
        });

        return expenseElement;
    }

    // ===== ЦЕЛИ НАКОПЛЕНИЯ =====

    addSavingsGoal(goalData) {
        const goal = {
            id: generateId(),
            name: goalData.name,
            target: parseFloat(goalData.target),
            current: parseFloat(goalData.current) || 0,
            deadline: goalData.deadline,
            icon: goalData.icon,
            createdAt: new Date().toISOString()
        };

        this.savingsGoals.unshift(goal);
        storage.set('savingsGoals', this.savingsGoals);

        this.renderGoals();

        showNotification(`Цель "${goal.name}" добавлена`, 'success');

        return goal;
    }

    addToSavings(goalId, amount) {
        const goal = this.savingsGoals.find(g => g.id === goalId);
        if (!goal) return;

        // Проверяем, хватает ли средств на балансе
        if (amount > this.balance) {
            showNotification('Недостаточно средств на балансе', 'error');
            return;
        }

        goal.current += amount;
        this.balance -= amount;
        this.savings += amount;

        storage.set('savingsGoals', this.savingsGoals);
        storage.set('balance', this.balance);
        storage.set('savings', this.savings);

        this.renderGoals();
        this.updateBalance();

        showNotification(`${formatCurrency(amount)} отложено на "${goal.name}"`, 'success');

        // Проверяем, достигнута ли цель
        if (goal.current >= goal.target) {
            showNotification(`🎉 Цель "${goal.name}" достигнута!`, 'success', 5000);
        }
    }

    deleteGoal(goalId) {
        const goalIndex = this.savingsGoals.findIndex(g => g.id === goalId);
        if (goalIndex > -1) {
            const goal = this.savingsGoals[goalIndex];

            // Возвращаем накопленные средства на баланс
            this.balance += goal.current;
            this.savings -= goal.current;

            this.savingsGoals.splice(goalIndex, 1);

            storage.set('savingsGoals', this.savingsGoals);
            storage.set('balance', this.balance);
            storage.set('savings', this.savings);

            this.renderGoals();
            this.updateBalance();

            showNotification('Цель удалена', 'success');
        }
    }

    renderGoals() {
        const goalsContainer = document.getElementById('goals-container');
        const savingsGoalSelect = document.getElementById('savings-goal-select');

        if (!goalsContainer) return;

        goalsContainer.innerHTML = '';

        if (this.savingsGoals.length === 0) {
            goalsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullseye"></i>
                    <h4>Нет целей накопления</h4>
                    <p>Создайте свою первую цель</p>
                </div>
            `;

            // Обновляем select
            if (savingsGoalSelect) {
                savingsGoalSelect.innerHTML = '<option value="new-goal">+ Создать новую цель</option>';
            }

            return;
        }

        // Обновляем select
        if (savingsGoalSelect) {
            savingsGoalSelect.innerHTML = '<option value="new-goal">+ Создать новую цель</option>';

            this.savingsGoals.forEach(goal => {
                const option = document.createElement('option');
                option.value = goal.id;
                option.textContent = `${goal.icon} ${goal.name} (${formatCurrency(goal.current)} / ${formatCurrency(goal.target)})`;
                savingsGoalSelect.appendChild(option);
            });
        }

        // Рендерим цели
        this.savingsGoals.forEach(goal => {
            const goalElement = this.createGoalElement(goal);
            goalsContainer.appendChild(goalElement);
        });
    }

    createGoalElement(goal) {
        const goalElement = document.createElement('div');
        goalElement.className = 'goal-card';
        goalElement.setAttribute('data-id', goal.id);

        const percent = Math.round((goal.current / goal.target) * 100);
        const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
        const now = new Date();
        const daysLeft = deadlineDate ? Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24)) : null;

        goalElement.innerHTML = `
            <div class="goal-header">
                <span class="goal-icon">${goal.icon}</span>
                <h4>${goal.name}</h4>
                <span class="goal-amount">${formatCurrency(goal.current)} / ${formatCurrency(goal.target)}</span>
            </div>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div style="width: ${Math.min(percent, 100)}%"></div>
                </div>
            </div>
            <div class="goal-details">
                <span class="goal-percent">${percent}%</span>
                <span class="goal-date">
                    ${deadlineDate ?
                `До ${deadlineDate.toLocaleDateString('ru-RU')} (${daysLeft} дн.)` :
                'Без срока'}
                </span>
                <button class="goal-delete" title="Удалить цель">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Обработчик удаления
        const deleteBtn = goalElement.querySelector('.goal-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Удалить эту цель?')) {
                this.deleteGoal(goal.id);
            }
        });

        // Клик по цели для быстрого добавления средств
        goalElement.addEventListener('click', (e) => {
            if (!e.target.closest('.goal-delete')) {
                const amount = prompt(`Сколько отложить на "${goal.name}"?`, '1000');
                if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
                    this.addToSavings(goal.id, parseFloat(amount));
                }
            }
        });

        return goalElement;
    }

    // ===== БАЛАНС И СТАТИСТИКА =====

    updateBalance() {
        // Обновляем общий баланс
        this.updateElement('total-balance', formatCurrency(this.balance));

        // Рассчитываем расходы за месяц
        const monthExpenses = this.getExpensesByPeriod('month');
        const monthExpensesTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        this.updateElement('month-expenses', formatCurrency(monthExpensesTotal));

        // Рассчитываем сумму всех целей
        const goalsTotal = this.savingsGoals.reduce((sum, goal) => sum + goal.target, 0);
        this.updateElement('savings-goals', formatCurrency(goalsTotal));
    }

    updateChart() {
        const chartContainer = document.getElementById('categories-chart');
        if (!chartContainer) return;

        const categories = this.getCategoryStats();
        const total = categories.reduce((sum, cat) => sum + cat.total, 0);

        if (total === 0) {
            chartContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <p>Нет данных для графика</p>
                </div>
            `;
            return;
        }

        let chartHTML = '<div class="chart-placeholder">';

        categories.forEach(category => {
            const percent = Math.round((category.total / total) * 100);
            const height = percent + '%';

            chartHTML += `
                <div class="chart-bar" style="height: ${height}; background-color: ${category.color}" 
                     data-category="${category.name}">
                    <span class="chart-label">${category.name}</span>
                    <span class="chart-value">${percent}%</span>
                </div>
            `;
        });

        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    // ===== ИНСАЙТЫ И СОВЕТЫ =====

    generateInsights() {
        const insights = [];

        // Получаем расходы за неделю и за прошлую неделю
        const thisWeekExpenses = this.getExpensesByPeriod('week');
        const lastWeekExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return expenseDate >= twoWeeksAgo && expenseDate < oneWeekAgo;
        });

        const thisWeekTotal = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
        const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Инсайт 1: Сравнение с прошлой неделей
        if (lastWeekTotal > 0) {
            const diff = thisWeekTotal - lastWeekTotal;
            const diffPercent = Math.round((diff / lastWeekTotal) * 100);

            if (diff < 0) {
                insights.push({
                    icon: 'calendar-check',
                    title: 'Отличная неделя для накоплений!',
                    description: `Вы сэкономили ${formatCurrency(Math.abs(diff))} (${Math.abs(diffPercent)}%) по сравнению с прошлой неделей`
                });
            } else if (diff > 0 && diffPercent > 10) {
                insights.push({
                    icon: 'exclamation-triangle',
                    title: 'Внимание: рост расходов',
                    description: `Ваши расходы выросли на ${formatCurrency(diff)} (${diffPercent}%) по сравнению с прошлой неделей`
                });
            }
        }

        // Инсайт 2: Самая затратная категория
        const categories = this.getCategoryStats();
        if (categories.length > 0) {
            const topCategory = categories[0];
            const topPercent = Math.round((topCategory.total / thisWeekTotal) * 100);

            if (topPercent > 40) {
                insights.push({
                    icon: 'utensils',
                    title: `Вы много тратите на ${topCategory.name.toLowerCase()}`,
                    description: `${topCategory.name} составляет ${topPercent}% ваших расходов. Подумайте об оптимизации.`
                });
            }
        }

        // Инсайт 3: Прогресс целей
        if (this.savingsGoals.length > 0) {
            const closestGoal = this.savingsGoals.reduce((closest, goal) => {
                const goalPercent = (goal.current / goal.target) * 100;
                const closestPercent = (closest.current / closest.target) * 100;
                return goalPercent > closestPercent ? goal : closest;
            }, this.savingsGoals[0]);

            const goalPercent = Math.round((closestGoal.current / closestGoal.target) * 100);

            if (goalPercent > 50 && goalPercent < 100) {
                insights.push({
                    icon: 'trophy',
                    title: `Вы близки к цели "${closestGoal.name}"!`,
                    description: `Осталось накопить ${formatCurrency(closestGoal.target - closestGoal.current)} (${100 - goalPercent}%)`
                });
            }
        }

        // Инсайт 4: Пик трат по времени (симуляция)
        insights.push({
            icon: 'bolt',
            title: 'Пик трат: среда, 18:00-21:00',
            description: 'Большинство покупок совершается в середине недели вечером'
        });

        this.insights = insights;
        this.renderInsights();
    }

    renderInsights() {
        const insightsContainer = document.querySelector('.insights-card');
        if (!insightsContainer) return;

        // Находим или создаем контейнер для инсайтов
        let insightsList = insightsContainer.querySelector('.insights-list');
        if (!insightsList) {
            insightsList = document.createElement('div');
            insightsList.className = 'insights-list';

            // Удаляем старый контент и добавляем новый
            const oldContent = insightsContainer.querySelectorAll('.insight-item');
            oldContent.forEach(el => el.remove());

            insightsContainer.appendChild(insightsList);
        }

        insightsList.innerHTML = '';

        this.insights.slice(0, 3).forEach(insight => {
            const insightElement = document.createElement('div');
            insightElement.className = 'insight-item';
            insightElement.innerHTML = `
                <i class="fas fa-${insight.icon}"></i>
                <div>
                    <p><strong>${insight.title}</strong></p>
                    <small>${insight.description}</small>
                </div>
            `;
            insightsList.appendChild(insightElement);
        });
    }

    // ===== ЭКСПОРТ/ИМПОРТ =====

    exportData() {
        const data = {
            expenses: this.expenses,
            savingsGoals: this.savingsGoals,
            balance: this.balance,
            savings: this.savings,
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `budget-data-${formatDate()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Данные экспортированы', 'success');
    }

    importData(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Проверяем структуру данных
                if (data.expenses && data.savingsGoals && data.balance !== undefined) {
                    this.expenses = data.expenses;
                    this.savingsGoals = data.savingsGoals;
                    this.balance = data.balance;
                    this.savings = data.savings || 0;

                    storage.set('expenses', this.expenses);
                    storage.set('savingsGoals', this.savingsGoals);
                    storage.set('balance', this.balance);
                    storage.set('savings', this.savings);

                    this.renderExpenses();
                    this.renderGoals();
                    this.updateBalance();
                    this.updateChart();
                    this.generateInsights();

                    showNotification('Данные успешно импортированы', 'success');
                } else {
                    showNotification('Некорректный формат файла', 'error');
                }
            } catch (error) {
                console.error('Ошибка импорта:', error);
                showNotification('Ошибка чтения файла', 'error');
            }
        };

        reader.readAsText(file);
    }

    clearData() {
        if (confirm('ВНИМАНИЕ! Это удалит все ваши данные. Продолжить?')) {
            this.expenses = [];
            this.savingsGoals = [];
            this.balance = 25000;
            this.savings = 0;

            storage.set('expenses', []);
            storage.set('savingsGoals', []);
            storage.set('balance', 25000);
            storage.set('savings', 0);

            this.renderExpenses();
            this.renderGoals();
            this.updateBalance();
            this.updateChart();
            this.generateInsights();

            showNotification('Все данные очищены', 'success');
        }
    }

    // ===== УТИЛИТЫ =====

    getCategoryInfo(category) {
        const categories = {
            food: { name: 'Еда', icon: '🍔', color: '#4CAF50' },
            transport: { name: 'Транспорт', icon: '🚗', color: '#2196F3' },
            utilities: { name: 'Коммуналка', icon: '🏠', color: '#FF9800' },
            entertainment: { name: 'Развлечения', icon: '🎬', color: '#9C27B0' },
            shopping: { name: 'Покупки', icon: '🛍️', color: '#E91E63' },
            health: { name: 'Здоровье', icon: '💊', color: '#00BCD4' },
            education: { name: 'Образование', icon: '📚', color: '#8BC34A' },
            other: { name: 'Другое', icon: '🔶', color: '#607D8B' }
        };

        return categories[category] || categories.other;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

    initEventHandlers() {
        // Добавление расхода
        const addExpenseBtn = document.getElementById('add-expense-btn');
        const expenseAmount = document.getElementById('expense-amount');

        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                this.handleAddExpense();
            });
        }

        if (expenseAmount) {
            expenseAmount.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleAddExpense();
                }
            });
        }

        // Добавление накоплений
        const addSavingsBtn = document.getElementById('add-savings-btn');
        if (addSavingsBtn) {
            addSavingsBtn.addEventListener('click', () => {
                this.handleAddSavings();
            });
        }

        // Выбор периода
        const periodSelect = document.getElementById('period-select');
        if (periodSelect) {
            periodSelect.addEventListener('change', () => {
                this.renderExpenses();
                this.updateChart();
            });
        }

        // Создание новой цели
        const newGoalBtn = document.getElementById('new-goal-btn');
        const newGoalModal = document.getElementById('new-goal-modal');
        const saveGoalBtn = document.getElementById('save-goal-btn');

        if (newGoalBtn && newGoalModal) {
            newGoalBtn.addEventListener('click', () => {
                newGoalModal.classList.add('active');
            });
        }

        if (saveGoalBtn) {
            saveGoalBtn.addEventListener('click', () => {
                this.handleAddGoal();
            });
        }

        // Выбор "Создать новую цель" в select
        const savingsGoalSelect = document.getElementById('savings-goal-select');
        if (savingsGoalSelect) {
            savingsGoalSelect.addEventListener('change', (e) => {
                if (e.target.value === 'new-goal') {
                    newGoalModal.classList.add('active');
                    e.target.value = this.savingsGoals.length > 0 ? this.savingsGoals[0].id : '';
                }
            });
        }

        // Экспорт данных
        const exportBtn = document.getElementById('export-data');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Импорт данных
        const importBtn = document.getElementById('import-data');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.addEventListener('change', (e) => {
                    if (e.target.files[0]) {
                        this.importData(e.target.files[0]);
                    }
                });
                input.click();
            });
        }

        // Очистка данных
        const clearBtn = document.getElementById('clear-data');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearData();
            });
        }
    }

    handleAddExpense() {
        const amountInput = document.getElementById('expense-amount');
        const categorySelect = document.getElementById('expense-category');
        const dateInput = document.getElementById('expense-date');
        const descriptionInput = document.getElementById('expense-description');

        const amount = parseFloat(amountInput.value);

        if (!amount || amount <= 0) {
            showNotification('Введите корректную сумму', 'error');
            return;
        }

        this.addExpense({
            amount,
            category: categorySelect.value,
            date: dateInput.value,
            description: descriptionInput.value.trim() || 'Без описания'
        });

        // Очищаем поля
        amountInput.value = '';
        descriptionInput.value = '';
        amountInput.focus();
    }

    handleAddSavings() {
        const amountInput = document.getElementById('savings-amount');
        const goalSelect = document.getElementById('savings-goal-select');

        const amount = parseFloat(amountInput.value);
        const goalId = goalSelect.value;

        if (!amount || amount <= 0) {
            showNotification('Введите корректную сумму', 'error');
            return;
        }

        if (goalId === 'new-goal' || !goalId) {
            showNotification('Выберите или создайте цель', 'error');
            return;
        }

        this.addToSavings(goalId, amount);

        // Очищаем поле
        amountInput.value = '';
    }

    handleAddGoal() {
        const nameInput = document.getElementById('goal-name');
        const targetInput = document.getElementById('goal-target-amount');
        const deadlineInput = document.getElementById('goal-deadline');
        const iconSelect = document.getElementById('goal-icon');
        const modal = document.getElementById('new-goal-modal');

        const name = nameInput.value.trim();
        const target = parseFloat(targetInput.value);
        const deadline = deadlineInput.value;
        const icon = iconSelect.value;

        if (!name || !target || target <= 0) {
            showNotification('Заполните все обязательные поля', 'error');
            return;
        }

        this.addSavingsGoal({
            name,
            target,
            deadline: deadline || null,
            icon,
            current: 0
        });

        // Закрываем модальное окно и очищаем поля
        modal.classList.remove('active');
        nameInput.value = '';
        targetInput.value = '';
        deadlineInput.value = '';

        showNotification('Цель создана', 'success');
    }
}

// Инициализация при загрузке страницы
let budgetTracker;

document.addEventListener('DOMContentLoaded', function () {
    budgetTracker = new BudgetTracker();
});

// Экспортируем для использования в HTML
window.budgetTracker = budgetTracker;