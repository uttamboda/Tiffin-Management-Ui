import * as api from './api.js';
import * as ui from './ui.js';
import * as cart from './cart.js';
import * as orders from './orders.js';
import * as dashboard from './dashboard.js';

// Assign all modules dynamically to global window object
// This ensures that all existing inline HTML parameters like onclick="deleteMenu(1)" 
// and dynamic elements generated using innerHTML inside specific components continue perfectly without edits.
Object.assign(window, api, ui, cart, orders, dashboard);

window.logout = function () {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('tenant_username');
    localStorage.removeItem('shop_setup_complete');
    window.location.href = 'login.html';
};

// ==========================================
// INITIALIZATION
// ==========================================

// Run correct init based on page
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.endsWith('login.html') || currentPath.endsWith('register.html');
    const isShopSetupPage = currentPath.endsWith('shop-setup.html');

    if (!localStorage.getItem('jwt_token')) {
        if (!isAuthPage) {
            window.location.href = 'login.html';
            return;
        }
    } else {
        // Logged in but shop isn't verified (or they are explicitly trying to set it up)
        const shopComplete = localStorage.getItem('shop_setup_complete') === 'true';
        if (!shopComplete && !isShopSetupPage && !isAuthPage) {
            window.location.href = 'shop-setup.html';
            return;
        }
    }

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
