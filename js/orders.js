import { apiFetch, extractPaginatedData } from './api.js';
import { showAlert } from './ui.js';
import { orderCart, renderCart } from './cart.js';

export async function loadOrderFormMetadata() {
    try {
        // Load Users
        const usersDataResp = await apiFetch(`/users?page=0&size=500`);
        const users = extractPaginatedData(usersDataResp);

        const userSelect = document.getElementById('orderUserSelect');
        if (userSelect && users.length > 0) {
            userSelect.innerHTML = '<option value="" disabled selected>-- Select a User --</option>';
            users.forEach(u => {
                userSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.phone})</option>`;
            });
        }

        // Load Menu Items
        const menuDataResp = await apiFetch(`/menu_item?page=0&size=500`);
        const menu = extractPaginatedData(menuDataResp);

        const menuContainer = document.getElementById('orderMenuContainer');
        if (menuContainer && menu.length > 0) {
            menuContainer.innerHTML = '';
            menu.forEach(item => {
                const row = document.createElement('div');
                row.className = 'row g-3 align-items-center mb-3 pb-3 border-bottom';
                row.innerHTML = `
                    <div class="col-md-5">
                        <span class="fw-bold text-dark fs-6">${item.dishName}</span>
                        <br>
                        <span class="text-success small fw-medium">Price: ₹${item.priceDefault.toFixed(2)}</span>
                    </div>
                    <div class="col-md-3">
                        <label class="small text-muted fw-bold text-uppercase" style="font-size: 0.7rem;">Sell Price</label>
                        <input type="number" id="menuSellPrice_${item.id}" class="form-control form-control-sm border-0 bg-light fw-medium" value="${item.priceDefault}" step="0.01">
                    </div>
                    <div class="col-md-2">
                        <label class="small text-muted fw-bold text-uppercase" style="font-size: 0.7rem;">Qty</label>
                        <input type="number" id="menuQty_${item.id}" class="form-control form-control-sm border-0 bg-light fw-medium text-center" value="1" min="1">
                    </div>
                    <div class="col-md-2 text-end mt-4">
                        <button type="button" class="btn btn-sm btn-light text-primary border shadow-sm px-3" onclick="addItemToCart(${item.id}, '${item.dishName.replace(/'/g, "\\'")}')">
                            Add <i class="bi bi-plus"></i>
                        </button>
                    </div>
                `;
                menuContainer.appendChild(row);
            });
        }
    } catch (error) {
        showAlert(`Failed to load users or menu items: ${error.message}`, 'danger');
    }
}

export async function placeOrder(event) {
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

    const selectedDate = document.getElementById('orderDate').value;
    const payload = {
        userId: parseInt(userId),
        status: "CREATED",
        items: orderCart.map(item => ({
            menuId: item.menuId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice
        }))
    };

    if (selectedDate && selectedDate.trim() !== "") {
        payload.orderDate = selectedDate;   // format YYYY-MM-DD
    }

    try {
        await apiFetch(`/orders`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        showAlert('Order placed successfully!', 'success');
        cancelOrder();
    } catch (error) {
        showAlert(`Failed to place order: ${error.message}`, 'danger');
    }
}

export function cancelOrder() {
    orderCart.length = 0;
    renderCart();
    document.getElementById('orderForm').reset();

    // Also reset all qty inputs to 1 and prices to their original
    // A full reload of the metadata does this easily.
    loadOrderFormMetadata();
}

// ==========================================
// ORDER HISTORY
// ==========================================

export async function markOrderCompleted(orderId) {
    if (!confirm('Are you sure you want to mark this order as completed?')) return;

    try {
        await apiFetch(`/orders/${orderId}/status?status=COMPLETED`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'COMPLETED' })
        });

        showAlert('Order marked as completed!', 'success');
        loadAllOrders(); // reload the orders without refreshing
    } catch (error) {
        showAlert(`Failed to update order status: ${error.message}`, 'danger');
    }
}

export async function loadAllOrders() {
    const tbody = document.getElementById('ordersHistoryTableBody');
    if (!tbody) return;

    // Show loading state when Refresh is clicked or initially
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm me-2"></div>Loading orders...</td></tr>';

    try {
        const responseData = await apiFetch(`/orders?page=0&size=500&sort=id,desc`);
        const orders = extractPaginatedData(responseData);

        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No orders found.</td></tr>';
            return;
        }

        const pendingOrders = orders.filter(o => o.status !== 'COMPLETED');
        const completedOrders = orders.filter(o => o.status === 'COMPLETED');

        const renderRow = (order) => {
            // Accommodate standard DTO naming (can be user.name or userName based on mapping)
            const userNameDisplay = order.userName || (order.user ? order.user.name : 'Unknown User');

            // Apply conditional styling for status mapping to style.css
            let badgeClass = 'bg-secondary text-white';
            if (order.status === 'CREATED') badgeClass = 'badge-created';
            else if (order.status === 'COMPLETED') badgeClass = 'badge-completed';
            else if (order.status === 'CANCELLED') badgeClass = 'badge-cancelled';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-dark fs-6">#${order.id}</td>
                <td class="fw-medium text-dark"><i class="bi bi-person-circle text-primary me-2 opacity-75"></i>${userNameDisplay}</td>
                <td class="text-secondary"><i class="bi bi-calendar3 me-2 opacity-50"></i>${order.orderDate ? order.orderDate.split('.')[0].replace('T', ' ') : ''}</td>
                <td class="fw-bold text-success">₹${order.totalAmount.toFixed(2)}</td>
                <td><span class="badge ${badgeClass} border border-opacity-25 rounded-pill shadow-sm">${order.status}</span></td>
                <td>
                    <div class="d-flex gap-2 justify-content-center align-items-center">
                        <button class="btn btn-sm btn-light text-primary border shadow-sm fw-medium text-nowrap" onclick="viewOrderDetails(${order.id})">
                            <i class="bi bi-receipt"></i> Details
                        </button>
                        ${order.status !== 'COMPLETED' ? `
                        <button class="btn btn-sm btn-success shadow-sm text-nowrap" onclick="markOrderCompleted(${order.id})">
                            <i class="bi bi-check2-all"></i> Complete
                        </button>
                        ` : ''}
                    </div>
                </td>
            `;
            return tr;
        };

        if (pendingOrders.length > 0) {
            const trPendingHead = document.createElement('tr');
            trPendingHead.className = 'bg-light';
            trPendingHead.innerHTML = '<td colspan="6" class="fw-bold text-primary py-3 small text-uppercase" style="letter-spacing:0.5px;"><i class="bi bi-clock-history me-2"></i>Pending Orders</td>';
            tbody.appendChild(trPendingHead);
            pendingOrders.forEach(o => tbody.appendChild(renderRow(o)));
        }

        if (completedOrders.length > 0) {
            const trCompletedHead = document.createElement('tr');
            trCompletedHead.className = 'bg-light';
            trCompletedHead.innerHTML = '<td colspan="6" class="fw-bold text-success py-3 small text-uppercase" style="letter-spacing:0.5px;"><i class="bi bi-check2-circle me-2"></i>Completed History</td>';
            tbody.appendChild(trCompletedHead);
            completedOrders.forEach(o => tbody.appendChild(renderRow(o)));
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load orders: ${error.message}</td></tr>`;
        showAlert(`Failed to load order history: ${error.message}`, 'danger');
    }
}

export async function viewOrderDetails(orderId) {
    try {
        const orderInfo = await apiFetch(`/orders/${orderId}`);

        // Populate modal data
        document.getElementById('billOrderId').textContent = `#${orderInfo.id}`;
        document.getElementById('billOrderDate').textContent = orderInfo.orderDate ? orderInfo.orderDate.split('.')[0].replace('T', ' ') : '';

        // Handle DTO response where username may map differently
        const userNameDisplay = orderInfo.userName || (orderInfo.user ? orderInfo.user.name : 'Unknown User');
        document.getElementById('billUserName').textContent = userNameDisplay;

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
        showAlert(`Failed to load order bill details: ${error.message}`, 'danger');
    }
}

export function renderItemsTable(items) {
    const tbody = document.getElementById('billItemsTableBody');
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No items in this order.</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-dark pe-3">
                <div class="text-truncate" style="max-width: 180px;" title="${item.dishName}">${item.dishName}</div>
            </td>
            <td class="text-secondary text-end">₹${item.sellingPrice.toFixed(2)}</td>
            <td class="text-center fw-medium bg-light rounded-2">${item.quantity}</td>
            <td class="text-end fw-bold text-success pe-0">₹${item.itemSubtotal.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

export function openBillModal() {
    const billModalEl = document.getElementById('billModal');
    const modal = bootstrap.Modal.getInstance(billModalEl) || new bootstrap.Modal(billModalEl);
    modal.show();
}
