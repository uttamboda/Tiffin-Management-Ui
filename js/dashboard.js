import { apiFetch, extractPaginatedData } from './api.js';
import { showAlert } from './ui.js';

// ==========================================
// ANALYTICS INTEGRATION
// ==========================================

export let globalTotalRevenue = 0;
export let monthlyRevenueChartInstance = null;
export let dailyRevenueChartInstance = null;

export async function loadAnalyticsDashboard() {
    try {
        const data = await apiFetch(`/analytics/dashboard`);

        document.getElementById('statTotalUsers').textContent = data.totalUsers || 0;
        document.getElementById('statTotalOrders').textContent = data.totalOrders || 0;

        globalTotalRevenue = data.totalRevenue || 0;
        document.getElementById('statTotalRevenue').textContent = `₹${globalTotalRevenue.toFixed(2)}`;

        window.dashboardTodayRevenue = data.todayRevenue || 0;
        document.getElementById('statTodayOrders').textContent = data.todayOrders || 0;
        document.getElementById('statTodayRevenue').textContent = `₹${window.dashboardTodayRevenue.toFixed(2)}`;

        const dishDisplay = document.getElementById('mostOrderedDishCardDisplay');
        if (dishDisplay) {
            dishDisplay.textContent = (data.mostOrderedDish && data.mostOrderedDish.trim() !== "") ? data.mostOrderedDish : "No orders yet";
            dishDisplay.title = (data.mostOrderedDish && data.mostOrderedDish.trim() !== "") ? data.mostOrderedDish : "";
        }

        // Also trigger the other loaders if refresh is clicked
        loadAnalyticsCharts();
        loadTopUser();

        // Reset profit calculator on refresh
        const expenseInput = document.getElementById('expenseInput');
        if (expenseInput) expenseInput.value = '';
        const profitDisplay = document.getElementById('profitResultDisplay');
        if (profitDisplay) {
            profitDisplay.textContent = '--';
            profitDisplay.className = 'fw-bold mb-0';
        }
        const profitLabel = document.getElementById('profitResultLabel');
        if (profitLabel) {
            profitLabel.textContent = 'Enter expense to calculate';
            profitLabel.className = 'fw-medium text-muted';
        }
    } catch (error) {
        showAlert(`Failed to load analytics dashboard metrics: ${error.message}`, 'danger');
    }
}

export async function loadAnalyticsCharts() {
    try {
        // Fetch Monthly Revenue Data
        const revenueData = await apiFetch(`/analytics/revenue/monthly`);

        const displayEl = document.getElementById('monthlyRevenueCardValue');
        if (!displayEl) return;

        if (!revenueData || revenueData.length === 0) {
            displayEl.textContent = 'No data available';
            displayEl.className = 'fw-bold text-muted mb-0';
            displayEl.style.fontSize = '1.5rem';
        } else {
            // Get the latest month (last item in the array)
            const latestMonth = revenueData[revenueData.length - 1];
            const revenueAmount = latestMonth.revenue || 0;

            // Format amount to format like 12,500
            const formattedRevenue = revenueAmount.toLocaleString('en-IN', {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0
            });

            displayEl.textContent = `₹ ${formattedRevenue}`;
            displayEl.className = 'fw-bold text-success mb-0';
            displayEl.style.fontSize = '2.5rem';
        }
    } catch (error) {
        const displayEl = document.getElementById('monthlyRevenueCardValue');
        if (displayEl) {
            displayEl.textContent = 'No data available';
            displayEl.className = 'fw-bold text-muted mb-0';
            displayEl.style.fontSize = '1.5rem';
        }
    }

    try {
        // Fetch all orders and aggregate daily revenue (Line Chart)
        const historyDataResp = await apiFetch(`/orders?page=0&size=500`);
        const historyData = extractPaginatedData(historyDataResp);

        // Group orders by date and sum revenue
        const dailyRevenueMap = {};
        historyData.forEach(order => {
            if (order.status === 'COMPLETED') {
                const dateObj = new Date(order.orderDate);
                const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                if (!dailyRevenueMap[dateStr]) {
                    dailyRevenueMap[dateStr] = 0;
                }
                dailyRevenueMap[dateStr] += order.totalAmount;
            }
        });

        // Maintain chronological order of the last 7 days dynamically
        const drLabels = [];
        const drValues = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const pastDate = new Date(today);
            pastDate.setDate(today.getDate() - i);
            const dayLabel = pastDate.toLocaleDateString('en-US', { weekday: 'short' });
            drLabels.push(dayLabel);

            // If it's today, inject the exact known value from dashboard API
            if (i === 0 && typeof window.dashboardTodayRevenue !== 'undefined') {
                drValues.push(window.dashboardTodayRevenue);
            } else {
                drValues.push(dailyRevenueMap[dayLabel] || 0);
            }
        }

        const ctxDr = document.getElementById('dailyRevenueChart');
        if (ctxDr) {
            if (dailyRevenueChartInstance) dailyRevenueChartInstance.destroy();
            dailyRevenueChartInstance = new Chart(ctxDr.getContext('2d'), {
                type: 'line',
                data: {
                    labels: drLabels,
                    datasets: [{
                        label: 'Daily Revenue (₹)',
                        data: drValues,
                        backgroundColor: 'transparent',
                        borderColor: '#0dcaf0',
                        borderWidth: 2,
                        tension: 0,
                        pointRadius: 3,
                        pointBackgroundColor: '#0dcaf0'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return '₹' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { display: false },
                            ticks: {
                                callback: function (value) { return '₹' + value; }
                            }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    } catch (error) {
        console.error(`Error fetching analytics daily revenue chart: ${error.message}`);
    }
}

export async function loadTopUser() {
    try {
        const topUser = await apiFetch(`/analytics/users/top`);

        if (!topUser || Object.keys(topUser).length === 0) {
            document.getElementById('topUserName').textContent = 'N/A';
            document.getElementById('topUserOrders').textContent = '0';
            document.getElementById('topUserSpent').textContent = '₹0.00';
            return;
        }

        document.getElementById('topUserName').textContent = topUser.userName || 'Unknown';
        document.getElementById('topUserOrders').textContent = topUser.totalOrders || '0';
        document.getElementById('topUserSpent').textContent = topUser.totalSpent != null ? `₹${topUser.totalSpent.toFixed(2)}` : '₹0.00';

    } catch (error) {
        document.getElementById('topUserName').textContent = 'Error';
    }
}

export function calculateProfit() {
    const expenseInput = document.getElementById('expenseInput').value;
    const expense = parseFloat(expenseInput);

    const display = document.getElementById('profitResultDisplay');
    const label = document.getElementById('profitResultLabel');

    if (isNaN(expense) || expense < 0) {
        showAlert('Please enter a valid expense amount.', 'warning');
        return;
    }

    const netResult = globalTotalRevenue - expense;

    display.textContent = `₹${Math.abs(netResult).toFixed(2)}`;

    // Clear old classes on badge
    label.className = 'badge px-3 py-2 rounded-pill shadow-sm ';

    if (netResult === 0) {
        display.className = 'fw-bold mb-0 breakeven-text';
        label.className += 'bg-secondary';
        label.textContent = 'Breakeven';
    } else if (netResult > 0) {
        display.className = 'fw-bold mb-0 profit-text';
        label.className += 'bg-success';
        label.textContent = 'Profit';
    } else {
        display.className = 'fw-bold mb-0 loss-text';
        label.className += 'bg-danger';
        label.textContent = 'Loss';
    }
}
