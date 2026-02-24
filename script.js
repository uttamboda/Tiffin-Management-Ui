const API_BASE_URL = 'http://localhost:8080';

// Universal function to show alerts
function showAlert(message, type = 'success') {
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

async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE_URL}/menu_item`);
        if (!response.ok) throw new Error('Failed to load menu');
        const data = await response.json();

        const tbody = document.getElementById('menuTableBody');
        if (!tbody) return; // Not on menu page

        tbody.innerHTML = '';
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td class="fw-medium">${item.dishName}</td>
                <td>₹${item.priceDefault.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="openEditMenuModal(${item.id}, '${item.dishName.replace(/'/g, "\\'")}', ${item.priceDefault})">
                        <i class="bi bi-pencil-square"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMenu(${item.id})">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching menu:', error);
        showAlert('Failed to load menu items.', 'danger');
    }
}

async function addMenu(event) {
    event.preventDefault();
    const dishName = document.getElementById('dishName').value;
    const price = parseFloat(document.getElementById('price').value);

    try {
        const response = await fetch(`${API_BASE_URL}/menu_item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dishName, priceDefault: price })
        });

        if (response.ok) {
            showAlert('Menu item added successfully!');
            document.getElementById('addMenuForm').reset();
            loadMenu();
        } else {
            throw new Error('Failed to add');
        }
    } catch (error) {
        showAlert('Failed to add menu item.', 'danger');
    }
}

function openEditMenuModal(id, dishName, price) {
    document.getElementById('editMenuId').value = id;
    document.getElementById('editDishName').value = dishName;
    document.getElementById('editPrice').value = price;

    const editModal = new bootstrap.Modal(document.getElementById('editMenuModal'));
    editModal.show();
}

async function updateMenu(event) {
    event.preventDefault();
    const id = document.getElementById('editMenuId').value;
    const dishName = document.getElementById('editDishName').value;
    const price = parseFloat(document.getElementById('editPrice').value);

    try {
        const response = await fetch(`${API_BASE_URL}/menu_item/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dishName, priceDefault: price })
        });

        if (response.ok) {
            const modalEl = document.getElementById('editMenuModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            showAlert('Menu item updated successfully!');
            loadMenu();
        } else {
            throw new Error('Failed to update');
        }
    } catch (error) {
        showAlert('Failed to update menu item.', 'danger');
    }
}

async function deleteMenu(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/menu_item/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showAlert('Menu item deleted successfully!');
            loadMenu();
        } else {
            throw new Error('Failed to delete');
        }
    } catch (error) {
        showAlert('Failed to delete menu item.', 'danger');
    }
}

// ==========================================
// USER MANAGEMENT
// ==========================================

async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`);
        if (!response.ok) throw new Error('Failed to load users');
        const data = await response.json();

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return; // Not on users page

        tbody.innerHTML = '';
        data.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td class="fw-medium">${user.name}</td>
                <td>${user.phone}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        showAlert('Failed to load users.', 'danger');
    }
}

async function createUser(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;

    try {
        // Pre-flight check: see if a user with this phone number already exists
        const usersResp = await fetch(`${API_BASE_URL}/users`);
        if (usersResp.ok) {
            const users = await usersResp.json();
            const existingUser = users.find(u => u.phone === phone);
            if (existingUser) {
                showAlert('This phone number is already registered.', 'warning');
                return;
            }
        }

        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone })
        });

        if (response.ok) {
            showAlert('User created successfully!');
            document.getElementById('addUserForm').reset();
            loadUsers();
        } else {
            // Note: If backend additionally returns 400/409 for duplicate, this block can handle its message if parsed.
            throw new Error('Failed to create user');
        }
    } catch (error) {
        showAlert('Failed to create user.', 'danger');
    }
}

// ==========================================
// ORDER CREATION
// ==========================================

let orderCart = [];

async function loadOrderFormMetadata() {
    try {
        // Load Users
        const usersResp = await fetch(`${API_BASE_URL}/users`);
        if (usersResp.ok) {
            const users = await usersResp.json();
            const userSelect = document.getElementById('orderUserSelect');
            if (userSelect) {
                userSelect.innerHTML = '<option value="" disabled selected>-- Select a User --</option>';
                users.forEach(u => {
                    userSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.phone})</option>`;
                });
            }
        }

        // Load Menu Items
        const menuResp = await fetch(`${API_BASE_URL}/menu_item`);
        if (menuResp.ok) {
            const menu = await menuResp.json();
            const menuContainer = document.getElementById('orderMenuContainer');
            if (menuContainer) {
                menuContainer.innerHTML = '';
                menu.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'row g-3 align-items-center mb-3 pb-3 border-bottom';
                    row.innerHTML = `
                        <div class="col-md-4">
                            <span class="fw-medium">${item.dishName}</span>
                            <br>
                            <span class="text-secondary small">Default: ₹${item.priceDefault.toFixed(2)}</span>
                        </div>
                        <div class="col-md-3">
                            <label class="small text-muted">Selling Price (₹)</label>
                            <input type="number" id="menuSellPrice_${item.id}" class="form-control form-control-sm" value="${item.priceDefault}" step="0.01">
                        </div>
                        <div class="col-md-2">
                            <label class="small text-muted">Qty</label>
                            <input type="number" id="menuQty_${item.id}" class="form-control form-control-sm" value="1" min="1">
                        </div>
                        <div class="col-md-3 text-end mt-4">
                            <button type="button" class="btn btn-sm btn-outline-primary" onclick="addItemToCart(${item.id}, '${item.dishName.replace(/'/g, "\\'")}')">
                                <i class="bi bi-plus-circle"></i> Add
                            </button>
                        </div>
                    `;
                    menuContainer.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error('Error loading order metadata:', error);
        showAlert('Failed to load users or menu items.', 'danger');
    }
}

function addItemToCart(id, dishName) {
    const sellPrice = parseFloat(document.getElementById(`menuSellPrice_${id}`).value);
    const qty = parseInt(document.getElementById(`menuQty_${id}`).value);

    if (isNaN(sellPrice) || sellPrice < 0 || isNaN(qty) || qty < 1) {
        alert('Invalid price or quantity');
        return;
    }

    // Check if item already exists in cart, then update it
    const existingIndex = orderCart.findIndex(i => i.menuId === id);
    if (existingIndex !== -1) {
        orderCart[existingIndex].quantity += qty;
        orderCart[existingIndex].sellingPrice = sellPrice; // update to latest price indicated
    } else {
        orderCart.push({
            menuId: id,
            dishName: dishName,
            sellingPrice: sellPrice,
            quantity: qty
        });
    }

    renderCart();
}

function removeCartItem(index) {
    orderCart.splice(index, 1);
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (orderCart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Cart is empty</td></tr>';
        document.getElementById('cartTotal').textContent = '₹0.00';
        return;
    }

    let total = 0;
    orderCart.forEach((item, index) => {
        const subtotal = item.sellingPrice * item.quantity;
        total += subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.dishName}</td>
            <td>₹${item.sellingPrice.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td class="fw-medium">₹${subtotal.toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeCartItem(${index})">
                    <i class="bi bi-x-lg"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('cartTotal').textContent = `₹${total.toFixed(2)}`;
}

async function placeOrder(event) {
    event.preventDefault();
    const userId = document.getElementById('orderUserSelect').value;

    if (!userId) {
        showAlert('Please select a user first.', 'warning');
        return;
    }

    if (orderCart.length === 0) {
        showAlert('Cart is empty. Please add items to order.', 'warning');
        return;
    }

    const payload = {
        userId: parseInt(userId),
        status: "CREATED",
        items: orderCart.map(item => ({
            menuId: item.menuId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice
        }))
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showAlert('Order placed successfully!', 'success');
            // Clear form and cart
            cancelOrder();
        } else {
            throw new Error('Order creation failed');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showAlert('Failed to place order.', 'danger');
    }
}

function cancelOrder() {
    orderCart = [];
    renderCart();
    document.getElementById('orderForm').reset();

    // Also reset all qty inputs to 1 and prices to their original
    // A full reload of the metadata does this easily.
    loadOrderFormMetadata();
}

// ==========================================
// ORDER HISTORY
// ==========================================

async function markOrderCompleted(orderId) {
    if (!confirm('Are you sure you want to mark this order as completed?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status?status=COMPLETED`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'COMPLETED' })
        });

        if (response.ok) {
            showAlert('Order marked as completed!', 'success');
            loadAllOrders(); // reload the orders without refreshing
        } else {
            throw new Error('Failed to update status');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showAlert('Failed to update order status.', 'danger');
    }
}

async function loadAllOrders() {
    const tbody = document.getElementById('ordersHistoryTableBody');
    if (!tbody) return;

    // Show loading state when Refresh is clicked or initially
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm me-2"></div>Loading orders...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        if (!response.ok) throw new Error('Failed to load orders history');

        const orders = await response.json();
        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No orders found.</td></tr>';
            return;
        }

        // Sort orders descending by ID for latest first
        orders.sort((a, b) => b.id - a.id);

        const pendingOrders = orders.filter(o => o.status !== 'COMPLETED');
        const completedOrders = orders.filter(o => o.status === 'COMPLETED');

        const renderRow = (order) => {
            // Apply conditional styling for status
            let badgeClass = 'bg-secondary';
            if (order.status === 'CREATED') badgeClass = 'bg-info text-dark';
            else if (order.status === 'COMPLETED') badgeClass = 'bg-success';
            else if (order.status === 'CANCELLED') badgeClass = 'bg-danger';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-primary">#${order.id}</td>
                <td class="fw-medium">${order.userName}</td>
                <td>${order.orderDate ? order.orderDate.split('.')[0].replace('T', ' ') : ''}</td>
                <td class="fw-bold">₹${order.totalAmount.toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${order.status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-primary-custom" onclick="viewOrderDetails(${order.id})">
                        <i class="bi bi-eye"></i> View Bill
                    </button>
                    ${order.status !== 'COMPLETED' ? `
                    <button class="btn btn-sm btn-success ms-1" onclick="markOrderCompleted(${order.id})">
                        <i class="bi bi-check-lg"></i> Mark Completed
                    </button>
                    ` : ''}
                </td>
            `;
            return tr;
        };

        if (pendingOrders.length > 0) {
            const trPendingHead = document.createElement('tr');
            trPendingHead.className = 'table-light';
            trPendingHead.innerHTML = '<td colspan="6" class="fw-bold text-primary py-3">Pending Orders</td>';
            tbody.appendChild(trPendingHead);
            pendingOrders.forEach(o => tbody.appendChild(renderRow(o)));
        }

        if (completedOrders.length > 0) {
            const trCompletedHead = document.createElement('tr');
            trCompletedHead.className = 'table-light';
            trCompletedHead.innerHTML = '<td colspan="6" class="fw-bold text-success py-3">Completed History</td>';
            tbody.appendChild(trCompletedHead);
            completedOrders.forEach(o => tbody.appendChild(renderRow(o)));
        }
    } catch (error) {
        console.error('Error fetching order history:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Failed to load orders.</td></tr>';
        showAlert('Failed to load order history.', 'danger');
    }
}

async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch order details');

        const orderInfo = await response.json();

        // Populate modal data
        document.getElementById('billOrderId').textContent = `#${orderInfo.id}`;
        document.getElementById('billOrderDate').textContent = orderInfo.orderDate ? orderInfo.orderDate.split('.')[0].replace('T', ' ') : '';
        document.getElementById('billUserName').textContent = orderInfo.userName;

        const statusBadge = document.getElementById('billStatus');
        statusBadge.textContent = orderInfo.status;
        statusBadge.className = 'badge';
        if (orderInfo.status === 'CREATED') statusBadge.classList.add('bg-info', 'text-dark');
        else if (orderInfo.status === 'COMPLETED') statusBadge.classList.add('bg-success');
        else if (orderInfo.status === 'CANCELLED') statusBadge.classList.add('bg-danger');
        else statusBadge.classList.add('bg-secondary');

        // Render items table
        renderItemsTable(orderInfo.items);

        // Render Total
        document.getElementById('billTotalAmount').textContent = `₹${orderInfo.totalAmount.toFixed(2)}`;

        // Open modal
        openBillModal();

    } catch (error) {
        console.error('Error fetching single order:', error);
        showAlert('Failed to load order bill details.', 'danger');
    }
}

function renderItemsTable(items) {
    const tbody = document.getElementById('billItemsTableBody');
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No items in this order.</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.dishName}</td>
            <td class="text-end">₹${item.sellingPrice.toFixed(2)}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-end fw-medium">₹${item.itemSubtotal.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openBillModal() {
    const modal = new bootstrap.Modal(document.getElementById('billModal'));
    modal.show();
}

// ==========================================
// INITIALIZATION
// ==========================================

// Run correct init based on page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('menuTableBody')) {
        loadMenu();
        document.getElementById('addMenuForm')?.addEventListener('submit', addMenu);
        document.getElementById('editMenuForm')?.addEventListener('submit', updateMenu);
    }

    if (document.getElementById('usersTableBody')) {
        loadUsers();
        document.getElementById('addUserForm')?.addEventListener('submit', createUser);
    }

    if (document.getElementById('orderForm')) {
        loadOrderFormMetadata();
        document.getElementById('orderForm')?.addEventListener('submit', placeOrder);
    }

    if (document.getElementById('ordersHistoryTableBody')) {
        loadAllOrders();
    }
});
