import * as api from './api.js';
import * as ui from './ui.js';
import * as cart from './cart.js';
import * as orders from './orders.js';
import * as dashboard from './dashboard.js';

// Assign all modules dynamically to global window object
// This ensures that all existing inline HTML parameters like onclick="deleteMenu(1)" 
// and dynamic elements generated using innerHTML inside specific components continue perfectly without edits.
Object.assign(window, api, ui, cart, orders, dashboard);

// ==========================================
// INITIALIZATION
// ==========================================

// Run correct init based on page
document.addEventListener('DOMContentLoaded', () => {
    // Global fix: Remove focus from modal trigger buttons to prevent "aria-hidden" accessibility errors
    document.addEventListener('hide.bs.modal', () => {
        if (document.activeElement) {
            document.activeElement.blur();
        }
    });

    if (document.getElementById('menuTableBody')) {
        ui.loadMenu();
        document.getElementById('addMenuForm')?.addEventListener('submit', ui.addMenu);
        document.getElementById('editMenuForm')?.addEventListener('submit', ui.updateMenu);
    }

    if (document.getElementById('usersTableBody')) {
        ui.loadUsers();
        document.getElementById('addUserForm')?.addEventListener('submit', ui.createUser);
    }

    if (document.getElementById('orderForm')) {
        orders.loadOrderFormMetadata();
        document.getElementById('orderForm')?.addEventListener('submit', orders.placeOrder);
    }

    if (document.getElementById('ordersHistoryTableBody')) {
        orders.loadAllOrders();
    }

    if (document.getElementById('analyticsMainContainer')) {
        dashboard.loadAnalyticsDashboard();
    }
});
