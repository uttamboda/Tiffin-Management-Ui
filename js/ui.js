import { apiFetch, extractPaginatedData } from './api.js';

// Universal function to show alerts
export function showAlert(message, type = 'success') {
    const alertBody = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3 shadow" style="z-index: 9999; min-width: 300px;" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', alertBody);
    setTimeout(() => {
        const alert = document.querySelector('.alert:last-child');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 4000);
}

// ==========================================
// MENU MANAGEMENT
// ==========================================

export async function loadMenu() {
    try {
        // Handle pagination by requesting a large size
        const responseData = await apiFetch(`/menu_item?page=0&size=500`);
        const data = extractPaginatedData(responseData);

        const tbody = document.getElementById('menuTableBody');
        if (!tbody) return; // Not on menu page

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No menu items found.</td></tr>';
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-secondary fw-medium">#${item.id}</td>
                <td class="fw-bold text-dark fs-6">${item.dishName}</td>
                <td class="fw-bold text-success fs-6">₹${item.priceDefault.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-light text-primary me-2 fw-medium shadow-sm border" onclick="openEditMenuModal(${item.id}, '${item.dishName.replace(/'/g, "\\'")}', ${item.priceDefault})">
                        <i class="bi bi-pencil-square"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-light text-danger fw-medium shadow-sm border" onclick="deleteMenu(${item.id})">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showAlert(`Failed to load menu: ${error.message}`, 'danger');
    }
}

export async function addMenu(event) {
    event.preventDefault();
    const dishName = document.getElementById('dishName').value.trim();
    const priceStr = document.getElementById('price').value;

    if (!dishName) {
        showAlert('Dish name is required', 'warning');
        return;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
        showAlert('Valid price is required', 'warning');
        return;
    }

    try {
        await apiFetch(`/menu_item`, {
            method: 'POST',
            body: JSON.stringify({ dishName, priceDefault: price })
        });

        showAlert('Menu item added successfully!');
        document.getElementById('addMenuForm').reset();
        loadMenu();
    } catch (error) {
        showAlert(`Failed to add menu item: ${error.message}`, 'danger');
    }
}

export function openEditMenuModal(id, dishName, price) {
    document.getElementById('editMenuId').value = id;
    document.getElementById('editDishName').value = dishName;
    document.getElementById('editPrice').value = price;

    const editModalEl = document.getElementById('editMenuModal');
    const editModal = bootstrap.Modal.getInstance(editModalEl) || new bootstrap.Modal(editModalEl);
    editModal.show();
}

export async function updateMenu(event) {
    event.preventDefault();
    const id = document.getElementById('editMenuId').value;
    const dishName = document.getElementById('editDishName').value.trim();
    const priceStr = document.getElementById('editPrice').value;

    if (!dishName) {
        showAlert('Dish name is required', 'warning');
        return;
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
        showAlert('Valid price is required', 'warning');
        return;
    }

    try {
        await apiFetch(`/menu_item/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ dishName, priceDefault: price })
        });

        const modalEl = document.getElementById('editMenuModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        showAlert('Menu item updated successfully!');
        loadMenu();
    } catch (error) {
        showAlert(`Failed to update menu item: ${error.message}`, 'danger');
    }
}

export async function deleteMenu(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        await apiFetch(`/menu_item/${id}`, {
            method: 'DELETE'
        });

        showAlert('Menu item deleted successfully!');
        loadMenu();
    } catch (error) {
        showAlert(`Failed to delete menu item: ${error.message}`, 'danger');
    }
}

// ==========================================
// USER MANAGEMENT
// ==========================================

export async function loadUsers() {
    try {
        const responseData = await apiFetch(`/users?page=0&size=500`);
        const data = extractPaginatedData(responseData);

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return; // Not on users page

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No users found.</td></tr>';
            return;
        }

        data.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-secondary fw-medium">#${user.id}</td>
                <td class="fw-bold text-dark"><i class="bi bi-person-circle text-primary me-2"></i>${user.name}</td>
                <td class="text-secondary"><i class="bi bi-telephone text-muted me-2"></i>${user.phone}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showAlert(`Failed to load users: ${error.message}`, 'danger');
    }
}

export async function createUser(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    if (!name || !phone) {
        showAlert('Name and phone are required', 'warning');
        return;
    }

    try {
        await apiFetch(`/users`, {
            method: 'POST',
            body: JSON.stringify({ name, phone })
        });

        showAlert('User created successfully!');
        document.getElementById('addUserForm').reset();
        loadUsers();
    } catch (error) {
        showAlert(`Failed to create user: ${error.message}`, 'danger');
    }
}
