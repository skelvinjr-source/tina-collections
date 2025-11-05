// Admin Backoffice JavaScript
// Tina Collections Admin Panel

// ============================================
// CONFIGURATION & AUTHENTICATION
// ============================================

// Current authenticated user
let currentAdmin = null;
let currentSession = null;
let allProducts = [];
let allOrders = [];
let allMessages = [];
let salesChartInstance = null;
let revenueChartInstance = null;

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const titles = { success: 'Success!', error: 'Error', warning: 'Warning', info: 'Information' };

    notification.innerHTML = `
        <div class="notification-icon">${icons[type]}</div>
        <div class="notification-content">
            <div class="notification-title">${titles[type]}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ============================================
// SIMPLE PASSWORD AUTHENTICATION
// ============================================

// Admin password - CHANGE THIS!
const ADMIN_PASSWORD = 'Tinajr@1974';

async function loginAdmin(event) {
    event.preventDefault();

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password-input').value;

    // Show loading state
    const loginBtn = document.getElementById('login-btn');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginBtnSpinner = document.getElementById('login-btn-spinner');

    loginBtn.disabled = true;
    loginBtnText.style.display = 'none';
    loginBtnSpinner.style.display = 'inline';

    try {
        // Simple password check - check custom password first, then default
        const customPassword = localStorage.getItem('adminPassword');
        const correctPassword = customPassword || ADMIN_PASSWORD;

        if (password !== correctPassword) {
            throw new Error('Incorrect password. Please try again.');
        }

        // Store session
        currentAdmin = {
            id: 'admin',
            email: email || 'admin@tinacollections.com',
            loginTime: new Date()
        };
        currentSession = { authenticated: true };

        // Store in localStorage
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminEmail', currentAdmin.email);

        // Hide login, show dashboard
        document.getElementById('admin-login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'flex';

        showNotification(`Welcome back, Admin!`, 'success');

        // Log activity
        await logAdminActivity('login', 'Admin user logged in');

        // Initialize dashboard
        initDashboard();

    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed. Please check your credentials.', 'error');

        // Reset login button
        loginBtn.disabled = false;
        loginBtnText.style.display = 'inline';
        loginBtnSpinner.style.display = 'none';
    }
}

async function logoutAdmin() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    try {
        // Log the logout
        await logAdminActivity('logout', 'Admin user logged out');

        // Clear session
        currentAdmin = null;
        currentSession = null;
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminEmail');

        // Show login screen
        document.getElementById('admin-login-screen').style.display = 'flex';
        document.getElementById('admin-dashboard').style.display = 'none';

        // Clear form
        document.getElementById('admin-email').value = '';
        document.getElementById('admin-password-input').value = '';

        showNotification('Logged out successfully', 'info');

    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error during logout: ' + error.message, 'error');
    }
}

// Check if user is already authenticated
async function checkAuth() {
    try {
        // Check localStorage for existing session
        const isLoggedIn = localStorage.getItem('adminLoggedIn');
        const email = localStorage.getItem('adminEmail');

        if (isLoggedIn === 'true') {
            // User is authenticated
            currentAdmin = {
                id: 'admin',
                email: email || 'admin@tinacollections.com',
                loginTime: new Date()
            };
            currentSession = { authenticated: true };

            // Show dashboard
            document.getElementById('admin-login-screen').style.display = 'none';
            document.getElementById('admin-dashboard').style.display = 'flex';

            // Initialize dashboard
            initDashboard();
        } else {
            // Show login screen
            document.getElementById('admin-login-screen').style.display = 'flex';
            document.getElementById('admin-dashboard').style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // Show login screen on error
        document.getElementById('admin-login-screen').style.display = 'flex';
        document.getElementById('admin-dashboard').style.display = 'none';
    }
}

// No auth state listener needed for simple authentication

// Log admin activity
async function logAdminActivity(actionType, description, affectedTable = null, affectedId = null) {
    try {
        if (!currentAdmin) return;

        await supabaseClient
            .from('admin_activity_log')
            .insert([{
                user_id: currentAdmin.id,
                action_type: actionType,
                description: description,
                affected_table: affectedTable,
                affected_id: affectedId,
                admin_user: currentAdmin.email
            }]);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// ============================================
// NAVIGATION
// ============================================
function showSection(sectionName) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`section-${sectionName}`).classList.add('active');

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        products: 'Products Management',
        orders: 'Orders Management',
        messages: 'Customer Messages',
        inventory: 'Inventory Management',
        analytics: 'Business Analytics',
        settings: 'Settings',
        backup: 'Backup & Export'
    };
    document.getElementById('section-title').textContent = titles[sectionName];

    // Load section data
    loadSectionData(sectionName);
}

function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'messages':
            loadMessages();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function refreshCurrentSection() {
    const activeSection = document.querySelector('.nav-item.active');
    if (activeSection) {
        const section = activeSection.getAttribute('data-section');
        showNotification('Refreshing...', 'info', 2000);
        loadSectionData(section);
    }
}

// ============================================
// DASHBOARD
// ============================================
async function initDashboard() {
    loadDashboardData();
}

async function loadDashboardData() {
    try {
        // Load all data
        const [ordersResult, productsResult, messagesResult] = await Promise.all([
            SupabaseAPI.getAllOrders ? SupabaseAPI.getAllOrders() : getOrdersFromDB(),
            SupabaseAPI.getAllProducts ? SupabaseAPI.getAllProducts() : { success: true, products: [] },
            SupabaseAPI.getMessages()
        ]);

        if (ordersResult.success) {
            allOrders = ordersResult.orders || [];
            updateDashboardStats();
            loadRecentOrders();
            loadSalesChart();
        }

        if (productsResult.success) {
            allProducts = productsResult.products || [];
            loadTopProducts();
            loadLowStockAlert();
        }

        if (messagesResult.success) {
            allMessages = messagesResult.messages || [];
            updateBadges();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

function updateDashboardStats() {
    const totalRevenue = allOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const totalProducts = allProducts.length;

    document.getElementById('stat-revenue').textContent = totalRevenue.toFixed(2);
    document.getElementById('stat-orders').textContent = totalOrders;
    document.getElementById('stat-products').textContent = totalProducts;
    document.getElementById('stat-pending').textContent = pendingOrders;
}

function updateBadges() {
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const unreadMessages = allMessages.filter(m => m.status === 'unread').length;

    document.getElementById('pending-orders-badge').textContent = pendingOrders;
    document.getElementById('unread-messages-badge').textContent = unreadMessages;
}

function loadRecentOrders() {
    const container = document.getElementById('recent-orders-list');
    const recentOrders = allOrders.slice(0, 5);

    if (recentOrders.length === 0) {
        container.innerHTML = '<p>No orders yet</p>';
        return;
    }

    container.innerHTML = recentOrders.map(order => `
        <p>
            <strong>Order #${order.id}</strong> - ${order.customer_name}<br>
            <span style="color: var(--success-color);">L$${order.total_amount}</span> -
            <span class="status-badge ${order.status}">${order.status}</span>
        </p>
    `).join('');
}

function loadTopProducts() {
    const container = document.getElementById('top-products-list');
    // This would need order_items data to calculate
    container.innerHTML = '<p>Feature coming soon - requires order analytics</p>';
}

function loadLowStockAlert() {
    const container = document.getElementById('low-stock-list');
    const lowStock = allProducts.filter(p => p.stock_quantity < 10 && p.in_stock);

    if (lowStock.length === 0) {
        container.innerHTML = '<p style="color: var(--success-color);">All products well stocked! ✓</p>';
        return;
    }

    container.innerHTML = lowStock.map(product => `
        <p style="color: var(--warning-color);">
            ⚠️ <strong>${product.name}</strong><br>
            Only ${product.stock_quantity} left in stock
        </p>
    `).join('');
}

function loadSalesChart() {
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;

    // Get last 7 days of sales
    const last7Days = [];
    const salesByDay = {};

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
        salesByDay[dateStr] = 0;
    }

    allOrders.forEach(order => {
        const orderDate = order.created_at.split('T')[0];
        if (salesByDay.hasOwnProperty(orderDate)) {
            salesByDay[orderDate] += parseFloat(order.total_amount);
        }
    });

    const chartData = last7Days.map(date => salesByDay[date]);

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            datasets: [{
                label: 'Sales (L$)',
                data: chartData,
                borderColor: '#8B4513',
                backgroundColor: 'rgba(139, 69, 19, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ============================================
// PRODUCTS MANAGEMENT
// ============================================
async function loadProducts() {
    try {
        const result = await (SupabaseAPI.getAllProducts ? SupabaseAPI.getAllProducts() : getProductsFromDB());

        if (result.success) {
            allProducts = result.products || [];
            displayProducts(allProducts);
        } else {
            showNotification('Error loading products', 'error');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('products-table-body');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No products found. Add your first product!</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td><img src="${product.image_url || 'images/placeholder.jpg'}" alt="${product.name}"></td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>L$${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock_quantity || 0}</td>
            <td><span class="status-badge ${product.in_stock ? 'in-stock' : 'out-of-stock'}">${product.in_stock ? 'In Stock' : 'Out of Stock'}</span></td>
            <td>
                <button onclick="editProduct(${product.id})" class="btn btn-secondary btn-small">Edit</button>
                <button onclick="deleteProduct(${product.id})" class="btn btn-secondary btn-small" style="background: var(--danger-color);">Delete</button>
            </td>
        </tr>
    `).join('');
}

function searchProducts() {
    const query = document.getElementById('product-search').value.toLowerCase();
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    displayProducts(filtered);
}

function openAddProductModal() {
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal').classList.add('active');
}

function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.stock_quantity || 0;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-image').value = product.image_url || '';
    document.getElementById('product-sizes').value = product.sizes ? product.sizes.join(',') : '';
    document.getElementById('product-colors').value = product.colors ? product.colors.join(',') : '';
    document.getElementById('product-in-stock').checked = product.in_stock;

    document.getElementById('product-modal').classList.add('active');
}

async function saveProduct(event) {
    event.preventDefault();

    const productData = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock_quantity: parseInt(document.getElementById('product-stock').value),
        description: document.getElementById('product-description').value,
        image_url: document.getElementById('product-image').value,
        sizes: document.getElementById('product-sizes').value.split(',').map(s => s.trim()),
        colors: document.getElementById('product-colors').value.split(',').map(c => c.trim()),
        in_stock: document.getElementById('product-in-stock').checked
    };

    const productId = document.getElementById('product-id').value;

    try {
        let result;
        if (productId) {
            result = await updateProductInDB(productId, productData);
            showNotification('Product updated successfully!', 'success');
        } else {
            result = await createProductInDB(productData);
            showNotification('Product created successfully!', 'success');
        }

        if (result.success) {
            closeProductModal();
            loadProducts();
        } else {
            showNotification(result.error || 'Error saving product', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const result = await deleteProductFromDB(productId);
        if (result.success) {
            showNotification('Product deleted successfully!', 'success');
            loadProducts();
        } else {
            showNotification('Error deleting product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error deleting product', 'error');
    }
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

// ============================================
// ORDERS MANAGEMENT
// ============================================
async function loadOrders() {
    try {
        const result = await (SupabaseAPI.getAllOrders ? SupabaseAPI.getAllOrders() : getOrdersFromDB());

        if (result.success) {
            allOrders = result.orders || [];
            displayOrders(allOrders);
            updateBadges();
        } else {
            showNotification('Error loading orders', 'error');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error loading orders', 'error');
    }
}

function displayOrders(orders) {
    const tbody = document.getElementById('orders-table-body');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>#${order.id}</strong></td>
            <td>${order.customer_name}</td>
            <td>${order.customer_phone}</td>
            <td>L$${parseFloat(order.total_amount).toFixed(2)}</td>
            <td>${order.payment_method}</td>
            <td>
                <select onchange="updateOrderStatus(${order.id}, this.value)" class="status-badge ${order.status}">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
            <td>
                <button onclick="viewOrderDetails(${order.id})" class="btn btn-secondary btn-small">View</button>
            </td>
        </tr>
    `).join('');
}

function searchOrders() {
    const query = document.getElementById('order-search').value.toLowerCase();
    const filtered = allOrders.filter(o =>
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_phone.includes(query) ||
        o.id.toString().includes(query)
    );
    displayOrders(filtered);
}

function filterOrders() {
    const status = document.getElementById('order-status-filter').value;
    if (status === 'all') {
        displayOrders(allOrders);
    } else {
        const filtered = allOrders.filter(o => o.status === status);
        displayOrders(filtered);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const result = await updateOrderStatusInDB(orderId, newStatus);
        if (result.success) {
            showNotification(`Order #${orderId} status updated to ${newStatus}`, 'success');
            loadOrders();
        } else {
            showNotification('Error updating order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Error updating order status', 'error');
    }
}

async function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    // Get order items
    const itemsResult = await getOrderItemsFromDB(orderId);
    const items = itemsResult.success ? itemsResult.items : [];

    const content = document.getElementById('order-details-content');
    content.innerHTML = `
        <div style="padding: 20px;">
            <h3>Order #${order.id}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div>
                    <h4>Customer Information</h4>
                    <p><strong>Name:</strong> ${order.customer_name}</p>
                    <p><strong>Phone:</strong> ${order.customer_phone}</p>
                    <p><strong>Address:</strong> ${order.customer_address}</p>
                </div>
                <div>
                    <h4>Order Information</h4>
                    <p><strong>Status:</strong> <span class="status-badge ${order.status}">${order.status}</span></p>
                    <p><strong>Payment:</strong> ${order.payment_method}</p>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                </div>
            </div>
            <h4>Order Items</h4>
            <table class="data-table" style="margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Size</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.product_name}</td>
                            <td>${item.size || 'N/A'}</td>
                            <td>${item.quantity}</td>
                            <td>L$${parseFloat(item.product_price).toFixed(2)}</td>
                            <td>L$${parseFloat(item.subtotal).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" style="text-align: right;"><strong>Total:</strong></td>
                        <td><strong>L$${parseFloat(order.total_amount).toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    document.getElementById('order-modal').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('active');
}

// ============================================
// MESSAGES MANAGEMENT
// ============================================
async function loadMessages() {
    try {
        const result = await SupabaseAPI.getMessages();

        if (result.success) {
            allMessages = result.messages || [];
            displayMessages(allMessages);
            updateBadges();
        } else {
            showNotification('Error loading messages', 'error');
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showNotification('Error loading messages', 'error');
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messages-list-container');

    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px;">No messages found</p>';
        return;
    }

    container.innerHTML = messages.map(msg => `
        <div class="message-item">
            <div class="message-header">
                <div class="message-info">
                    <h3>${msg.name}</h3>
                    <div class="message-meta">
                        <span>📧 ${msg.email}</span>
                        <span>📱 ${msg.phone}</span>
                        <span>📅 ${new Date(msg.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <span class="status-badge ${msg.status}">${msg.status}</span>
            </div>
            <div class="message-content">${msg.message}</div>
            ${msg.reply ? `<div style="background: #e8f5e9; padding: 10px; border-radius: 6px; margin-top: 10px;"><strong>Your Reply:</strong><br>${msg.reply}</div>` : ''}
            <div class="message-actions">
                <button onclick="markMessageAs(${msg.id}, '${msg.status === 'unread' ? 'read' : 'unread'}')" class="btn btn-secondary btn-small">
                    ${msg.status === 'unread' ? 'Mark Read' : 'Mark Unread'}
                </button>
                <button onclick="deleteMessage(${msg.id})" class="btn btn-secondary btn-small" style="background: var(--danger-color);">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterMessages() {
    const status = document.getElementById('message-status-filter').value;
    if (status === 'all') {
        displayMessages(allMessages);
    } else {
        const filtered = allMessages.filter(m => m.status === status);
        displayMessages(filtered);
    }
}

async function markMessageAs(messageId, status) {
    try {
        const result = await SupabaseAPI.updateMessageStatus(messageId, status);
        if (result.success) {
            showNotification(`Message marked as ${status}`, 'success');
            loadMessages();
        } else {
            showNotification('Error updating message', 'error');
        }
    } catch (error) {
        console.error('Error updating message:', error);
        showNotification('Error updating message', 'error');
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
        const result = await SupabaseAPI.deleteMessage(messageId);
        if (result.success) {
            showNotification('Message deleted', 'success');
            loadMessages();
        } else {
            showNotification('Error deleting message', 'error');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        showNotification('Error deleting message', 'error');
    }
}

// ============================================
// INVENTORY MANAGEMENT
// ============================================
async function loadInventory() {
    try {
        const result = await (SupabaseAPI.getAllProducts ? SupabaseAPI.getAllProducts() : getProductsFromDB());

        if (result.success) {
            allProducts = result.products || [];
            displayInventory(allProducts);
            loadStockProductsDropdown();
        } else {
            showNotification('Error loading inventory', 'error');
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
        showNotification('Error loading inventory', 'error');
    }
}

function displayInventory(products) {
    const tbody = document.getElementById('inventory-table-body');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">No products in inventory</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr>
            <td><strong>${product.name}</strong></td>
            <td>
                <span style="font-size: 20px; font-weight: bold; color: ${product.stock_quantity < 10 ? 'var(--danger-color)' : 'var(--success-color)'}">
                    ${product.stock_quantity || 0}
                </span>
            </td>
            <td>${product.category}</td>
            <td><span class="status-badge ${product.in_stock ? 'in-stock' : 'out-of-stock'}">${product.in_stock ? 'In Stock' : 'Out of Stock'}</span></td>
            <td>
                <button onclick="quickAdjustStock(${product.id}, 'add')" class="btn btn-secondary btn-small" style="background: var(--success-color);">+ Add</button>
                <button onclick="quickAdjustStock(${product.id}, 'remove')" class="btn btn-secondary btn-small" style="background: var(--danger-color);">- Remove</button>
            </td>
        </tr>
    `).join('');
}

function loadStockProductsDropdown() {
    const select = document.getElementById('stock-product-id');
    select.innerHTML = '<option value="">Choose a product...</option>' +
        allProducts.map(p => `<option value="${p.id}">${p.name} (Current: ${p.stock_quantity || 0})</option>`).join('');
}

function openStockAdjustmentModal() {
    document.getElementById('stock-form').reset();
    document.getElementById('stock-modal').classList.add('active');
}

function closeStockModal() {
    document.getElementById('stock-modal').classList.remove('active');
}

function updateStockQuantityLabel() {
    const type = document.getElementById('stock-adjustment-type').value;
    document.getElementById('stock-quantity-label').textContent =
        type === 'add' ? 'Quantity to Add *' : 'Quantity to Remove *';
}

async function quickAdjustStock(productId, type) {
    const quantity = prompt(`Enter quantity to ${type}:`);
    if (!quantity || isNaN(quantity) || quantity <= 0) return;

    const adjustmentData = {
        product_id: productId,
        quantity_change: type === 'add' ? parseInt(quantity) : -parseInt(quantity),
        reason: type === 'add' ? 'restock' : 'adjustment',
        notes: `Quick ${type} via admin panel`
    };

    try {
        const result = await createInventoryLogInDB(adjustmentData);
        if (result.success) {
            showNotification(`Stock ${type === 'add' ? 'added' : 'removed'} successfully!`, 'success');
            loadInventory();
            loadDashboardData(); // Refresh dashboard
        } else {
            showNotification('Error adjusting stock', 'error');
        }
    } catch (error) {
        console.error('Error adjusting stock:', error);
        showNotification('Error adjusting stock', 'error');
    }
}

async function saveStockAdjustment(event) {
    event.preventDefault();

    const type = document.getElementById('stock-adjustment-type').value;
    const quantity = parseInt(document.getElementById('stock-quantity').value);

    const adjustmentData = {
        product_id: parseInt(document.getElementById('stock-product-id').value),
        quantity_change: type === 'add' ? quantity : -quantity,
        reason: document.getElementById('stock-reason').value,
        notes: document.getElementById('stock-notes').value
    };

    try {
        const result = await createInventoryLogInDB(adjustmentData);
        if (result.success) {
            showNotification('Stock adjustment saved successfully!', 'success');
            closeStockModal();
            loadInventory();
            loadDashboardData();
        } else {
            showNotification('Error saving stock adjustment', 'error');
        }
    } catch (error) {
        console.error('Error saving stock adjustment:', error);
        showNotification('Error saving stock adjustment', 'error');
    }
}

// ============================================
// ANALYTICS
// ============================================
async function loadAnalytics() {
    try {
        const ordersResult = await getOrdersFromDB();
        if (ordersResult.success) {
            allOrders = ordersResult.orders || [];
            renderAnalyticsCharts();
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Error loading analytics', 'error');
    }
}

function renderAnalyticsCharts() {
    renderRevenueChart();
    renderOrdersStatusChart();
    renderCategoriesChart();
    renderPaymentMethodsChart();
}

function renderRevenueChart() {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;

    // Group by month
    const monthlyData = {};
    allOrders.forEach(order => {
        const month = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + parseFloat(order.total_amount);
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(monthlyData),
            datasets: [{
                label: 'Revenue (L$)',
                data: Object.values(monthlyData),
                backgroundColor: 'rgba(139, 69, 19, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function renderOrdersStatusChart() {
    const ctx = document.getElementById('orders-status-chart');
    if (!ctx) return;

    const statusCount = {};
    allOrders.forEach(order => {
        statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCount),
            datasets: [{
                data: Object.values(statusCount),
                backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#dc3545', '#6c757d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function renderCategoriesChart() {
    const ctx = document.getElementById('categories-chart');
    if (!ctx) return;

    const categoryCount = {};
    allProducts.forEach(product => {
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryCount),
            datasets: [{
                data: Object.values(categoryCount),
                backgroundColor: ['#8B4513', '#D2691E']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function renderPaymentMethodsChart() {
    const ctx = document.getElementById('payment-methods-chart');
    if (!ctx) return;

    const paymentCount = {};
    allOrders.forEach(order => {
        paymentCount[order.payment_method] = (paymentCount[order.payment_method] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(paymentCount),
            datasets: [{
                label: 'Orders',
                data: Object.values(paymentCount),
                backgroundColor: ['#FF6B35', '#F7931E']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y'
        }
    });
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
    // Load business settings from Supabase
    try {
        const result = await getBusinessSettingsFromDB();
        if (result.success && result.settings) {
            const settings = result.settings;
            document.getElementById('setting-business-name').value = settings.business_name || 'Tina Collections';
            document.getElementById('setting-business-email').value = settings.business_email || '';
            document.getElementById('setting-business-phone').value = settings.business_phone || '';
            document.getElementById('setting-delivery-fee').value = settings.delivery_fee || '0';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveBusinessSettings(event) {
    event.preventDefault();

    const settings = {
        business_name: document.getElementById('setting-business-name').value,
        business_email: document.getElementById('setting-business-email').value,
        business_phone: document.getElementById('setting-business-phone').value,
        delivery_fee: document.getElementById('setting-delivery-fee').value
    };

    try {
        const result = await updateBusinessSettingsInDB(settings);
        if (result.success) {
            showNotification('Settings saved successfully!', 'success');
        } else {
            showNotification('Error saving settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

async function changePassword(event) {
    event.preventDefault();

    const newPass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;

    // Validate inputs
    if (newPass !== confirm) {
        showNotification('New passwords do not match', 'error');
        return;
    }

    if (newPass.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        // Store new password in localStorage
        localStorage.setItem('adminPassword', newPass);

        // Log activity
        await logAdminActivity('password_change', 'Admin changed their password');

        showNotification('Password updated successfully! The new password will be used on next login.', 'success');
        event.target.reset();

        // Note: In a real application, you should update the password on the server side
        // This is a simple client-side demo. For production, implement proper server-side authentication.

    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Error updating password: ' + error.message, 'error');
    }
}

// ============================================
// BACKUP & EXPORT
// ============================================
async function exportData(type, format = 'json') {
    try {
        showNotification('Preparing export...', 'info', 2000);

        let data = {};
        let filename = '';
        const dateStr = new Date().toISOString().split('T')[0];

        // Fetch data based on type
        switch(type) {
            case 'all':
                const [orders, products, messages] = await Promise.all([
                    getOrdersFromDB(),
                    getProductsFromDB(),
                    SupabaseAPI.getMessages()
                ]);
                data = {
                    orders: orders.orders || [],
                    products: products.products || [],
                    messages: messages.messages || [],
                    exported_at: new Date().toISOString()
                };
                filename = `tina-collections-backup-${dateStr}`;
                break;

            case 'orders':
                const ordersResult = await getOrdersFromDB();
                data = ordersResult.orders || [];
                filename = `orders-export-${dateStr}`;
                break;

            case 'products':
                const productsResult = await getProductsFromDB();
                data = productsResult.products || [];
                filename = `products-export-${dateStr}`;
                break;

            case 'messages':
                const messagesResult = await SupabaseAPI.getMessages();
                data = messagesResult.messages || [];
                filename = `messages-export-${dateStr}`;
                break;
        }

        // Export based on format
        switch(format) {
            case 'json':
                exportAsJSON(data, filename);
                break;
            case 'pdf':
                exportAsPDF(data, filename, type);
                break;
            case 'excel':
                exportAsExcel(data, filename, type);
                break;
        }

        showNotification(`Data exported successfully as ${format.toUpperCase()}!`, 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Error exporting data', 'error');
    }
}

// Export as JSON
function exportAsJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `${filename}.json`);
}

// Export as PDF
function exportAsPDF(data, filename, type) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(139, 69, 19); // Primary color
    doc.text('Tina Collections', 105, 15, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });

    let yPosition = 45;

    // Generate tables based on data type
    if (type === 'orders') {
        const tableData = data.map(order => [
            `#${order.id}`,
            order.customer_name,
            order.customer_phone,
            `L$${parseFloat(order.total_amount).toFixed(2)}`,
            order.payment_method,
            order.status,
            new Date(order.created_at).toLocaleDateString()
        ]);

        doc.autoTable({
            head: [['Order #', 'Customer', 'Phone', 'Amount', 'Payment', 'Status', 'Date']],
            body: tableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [139, 69, 19] },
            styles: { fontSize: 8 }
        });
    } else if (type === 'products') {
        const tableData = data.map(product => [
            product.name,
            product.category,
            `L$${parseFloat(product.price).toFixed(2)}`,
            product.stock_quantity || 0,
            product.in_stock ? 'Yes' : 'No'
        ]);

        doc.autoTable({
            head: [['Product Name', 'Category', 'Price', 'Stock', 'Available']],
            body: tableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [139, 69, 19] },
            styles: { fontSize: 8 }
        });
    } else if (type === 'messages') {
        const tableData = data.map(msg => [
            msg.name,
            msg.email,
            msg.phone,
            msg.message.substring(0, 50) + '...',
            msg.status,
            new Date(msg.created_at).toLocaleDateString()
        ]);

        doc.autoTable({
            head: [['Name', 'Email', 'Phone', 'Message', 'Status', 'Date']],
            body: tableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [139, 69, 19] },
            styles: { fontSize: 8 },
            columnStyles: { 3: { cellWidth: 50 } }
        });
    } else if (type === 'all') {
        // Summary page for all data
        doc.setFontSize(12);
        doc.text('Database Summary', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.text(`Total Orders: ${data.orders.length}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Total Products: ${data.products.length}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Total Messages: ${data.messages.length}`, 20, yPosition);
        yPosition += 7;

        const totalRevenue = data.orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        doc.text(`Total Revenue: L$${totalRevenue.toFixed(2)}`, 20, yPosition);
        yPosition += 15;

        // Add orders table
        if (data.orders.length > 0) {
            doc.text('Recent Orders', 20, yPosition);
            yPosition += 5;

            const orderData = data.orders.slice(0, 10).map(order => [
                `#${order.id}`,
                order.customer_name,
                `L$${parseFloat(order.total_amount).toFixed(2)}`,
                order.status
            ]);

            doc.autoTable({
                head: [['Order #', 'Customer', 'Amount', 'Status']],
                body: orderData,
                startY: yPosition,
                theme: 'striped',
                headStyles: { fillColor: [139, 69, 19] },
                styles: { fontSize: 8 }
            });
        }
    }

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('Tina Collections - Admin Report', 105, 285, { align: 'center' });
    }

    doc.save(`${filename}.pdf`);
}

// Export as Excel
function exportAsExcel(data, filename, type) {
    let workbook;

    if (type === 'orders') {
        const worksheetData = [
            ['Order #', 'Customer Name', 'Phone', 'Address', 'Amount', 'Payment Method', 'Status', 'Date'],
            ...data.map(order => [
                order.id,
                order.customer_name,
                order.customer_phone,
                order.customer_address,
                parseFloat(order.total_amount),
                order.payment_method,
                order.status,
                new Date(order.created_at).toLocaleString()
            ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 30 },
            { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }
        ];

        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

    } else if (type === 'products') {
        const worksheetData = [
            ['ID', 'Name', 'Category', 'Price', 'Stock', 'In Stock', 'Description', 'Created'],
            ...data.map(product => [
                product.id,
                product.name,
                product.category,
                parseFloat(product.price),
                product.stock_quantity || 0,
                product.in_stock ? 'Yes' : 'No',
                product.description || '',
                new Date(product.created_at).toLocaleString()
            ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        worksheet['!cols'] = [
            { wch: 8 }, { wch: 30 }, { wch: 12 }, { wch: 10 },
            { wch: 8 }, { wch: 10 }, { wch: 50 }, { wch: 20 }
        ];

        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    } else if (type === 'messages') {
        const worksheetData = [
            ['ID', 'Name', 'Email', 'Phone', 'Message', 'Status', 'Date', 'Reply'],
            ...data.map(msg => [
                msg.id,
                msg.name,
                msg.email,
                msg.phone,
                msg.message,
                msg.status,
                new Date(msg.created_at).toLocaleString(),
                msg.reply || ''
            ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        worksheet['!cols'] = [
            { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
            { wch: 50 }, { wch: 10 }, { wch: 20 }, { wch: 50 }
        ];

        workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Messages');

    } else if (type === 'all') {
        workbook = XLSX.utils.book_new();

        // Orders sheet
        if (data.orders && data.orders.length > 0) {
            const ordersData = [
                ['Order #', 'Customer', 'Phone', 'Amount', 'Payment', 'Status', 'Date'],
                ...data.orders.map(order => [
                    order.id,
                    order.customer_name,
                    order.customer_phone,
                    parseFloat(order.total_amount),
                    order.payment_method,
                    order.status,
                    new Date(order.created_at).toLocaleString()
                ])
            ];
            const ordersSheet = XLSX.utils.aoa_to_sheet(ordersData);
            XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Orders');
        }

        // Products sheet
        if (data.products && data.products.length > 0) {
            const productsData = [
                ['ID', 'Name', 'Category', 'Price', 'Stock', 'In Stock'],
                ...data.products.map(product => [
                    product.id,
                    product.name,
                    product.category,
                    parseFloat(product.price),
                    product.stock_quantity || 0,
                    product.in_stock ? 'Yes' : 'No'
                ])
            ];
            const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
            XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
        }

        // Messages sheet
        if (data.messages && data.messages.length > 0) {
            const messagesData = [
                ['ID', 'Name', 'Email', 'Phone', 'Message', 'Status', 'Date'],
                ...data.messages.map(msg => [
                    msg.id,
                    msg.name,
                    msg.email,
                    msg.phone,
                    msg.message,
                    msg.status,
                    new Date(msg.created_at).toLocaleString()
                ])
            ];
            const messagesSheet = XLSX.utils.aoa_to_sheet(messagesData);
            XLSX.utils.book_append_sheet(workbook, messagesSheet, 'Messages');
        }

        // Summary sheet
        const summaryData = [
            ['Tina Collections - Database Summary'],
            ['Exported:', new Date().toLocaleString()],
            [''],
            ['Metric', 'Value'],
            ['Total Orders', data.orders.length],
            ['Total Products', data.products.length],
            ['Total Messages', data.messages.length],
            ['Total Revenue', data.orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0).toFixed(2) + ' L$']
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Write file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Helper function to download file
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (confirm(`Import ${Array.isArray(data) ? data.length : Object.keys(data).length} items?`)) {
                // Handle import logic here
                showNotification('Import feature coming soon!', 'info');
            }
        } catch (error) {
            showNotification('Invalid file format', 'error');
        }
    };
    reader.readAsText(file);
}

// ============================================
// DATABASE HELPER FUNCTIONS
// ============================================
async function getOrdersFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, orders: data };
    } catch (error) {
        console.error('Error fetching orders:', error);
        return { success: false, error: error.message };
    }
}

async function getOrderItemsFromDB(orderId) {
    try {
        const { data, error } = await supabaseClient
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);

        if (error) throw error;
        return { success: true, items: data };
    } catch (error) {
        console.error('Error fetching order items:', error);
        return { success: false, error: error.message };
    }
}

async function updateOrderStatusInDB(orderId, status) {
    try {
        const { error } = await supabaseClient
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating order status:', error);
        return { success: false, error: error.message };
    }
}

async function getProductsFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, products: data };
    } catch (error) {
        console.error('Error fetching products:', error);
        return { success: false, error: error.message };
    }
}

async function createProductInDB(productData) {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, product: data };
    } catch (error) {
        console.error('Error creating product:', error);
        return { success: false, error: error.message };
    }
}

async function updateProductInDB(productId, productData) {
    try {
        const { error } = await supabaseClient
            .from('products')
            .update({ ...productData, updated_at: new Date().toISOString() })
            .eq('id', productId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message };
    }
}

async function deleteProductFromDB(productId) {
    try {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
    }
}

async function createInventoryLogInDB(logData) {
    try {
        const { data, error } = await supabaseClient
            .from('inventory_logs')
            .insert([logData])
            .select()
            .single();

        if (error) throw error;
        return { success: true, log: data };
    } catch (error) {
        console.error('Error creating inventory log:', error);
        return { success: false, error: error.message };
    }
}

async function getBusinessSettingsFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('business_settings')
            .select('setting_key, setting_value');

        if (error) throw error;

        const settings = {};
        data.forEach(item => {
            settings[item.setting_key] = item.setting_value;
        });

        return { success: true, settings };
    } catch (error) {
        console.error('Error fetching settings:', error);
        return { success: false, error: error.message };
    }
}

async function updateBusinessSettingsInDB(settings) {
    try {
        const updates = Object.entries(settings).map(([key, value]) => ({
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabaseClient
            .from('business_settings')
            .upsert(updates, { onConflict: 'setting_key' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating settings:', error);
        return { success: false, error: error.message };
    }
}

// Extend SupabaseAPI with new methods
if (typeof SupabaseAPI !== 'undefined') {
    SupabaseAPI.getAllOrders = getOrdersFromDB;
    SupabaseAPI.getAllProducts = getProductsFromDB;
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
});
