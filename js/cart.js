export let orderCart = [];

export function addItemToCart(id, dishName) {
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

export function removeCartItem(index) {
    orderCart.splice(index, 1);
    renderCart();
}

export function renderCart() {
    const tbody = document.getElementById('cartTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (orderCart.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-5">
                    <i class="bi bi-cart-x fs-1 opacity-25 d-block mb-3"></i>
                    Cart is empty
                </td>
            </tr>`;
        document.getElementById('cartTotal').textContent = '₹0.00';
        return;
    }

    let total = 0;
    orderCart.forEach((item, index) => {
        const subtotal = item.sellingPrice * item.quantity;
        total += subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-dark pe-3">
                <div class="text-truncate" style="max-width: 150px;" title="${item.dishName}">${item.dishName}</div>
            </td>
            <td class="text-secondary">₹${item.sellingPrice.toFixed(2)}</td>
            <td class="text-center fw-medium bg-light rounded-2">${item.quantity}</td>
            <td class="fw-bold text-success text-end">₹${subtotal.toFixed(2)}</td>
            <td class="text-end">
                <button type="button" class="btn btn-sm btn-light text-danger shadow-sm border" onclick="removeCartItem(${index})">
                    <i class="bi bi-x"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('cartTotal').textContent = `₹${total.toFixed(2)}`;
}
