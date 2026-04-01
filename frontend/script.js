/**
 * Medics - Pharmacy Management System
 * Backend-backed client state with realtime sync
 */

const SESSION_KEY = 'medics-session';
let userCart = [];

const API = {
    token: '',
    eventSource: null,

    setToken(token) {
        this.token = token || '';
    },

    async request(url, options = {}) {
        const headers = { ...(options.headers || {}) };
        if (this.token) headers.Authorization = `Bearer ${this.token}`;
        if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

        const response = await fetch(url, { ...options, headers });
        let payload = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            throw new Error(payload?.error || 'Request failed');
        }

        return payload;
    },

    login(email, password) {
        return this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username: email, password })
        });
    },

    register({ name, email, password, role = 'Customer', address = '' }) {
        return this.request('/api/register', {
            method: 'POST',
            body: JSON.stringify({
                username: email,
                password,
                role,
                address,
                name
            })
        });
    },

    fetchData() {
        return this.request('/api/data');
    },

    createUser(user) {
        return this.request('/api/users', {
            method: 'POST',
            body: JSON.stringify(user)
        });
    },

    deleteUser(id) {
        return this.request(`/api/users/${id}`, { method: 'DELETE' });
    },

    createMedicine(medicine) {
        return this.request('/api/medicines', {
            method: 'POST',
            body: JSON.stringify(medicine)
        });
    },

    deleteMedicine(id) {
        return this.request(`/api/medicines/${id}`, { method: 'DELETE' });
    },

    placeOrder(order) {
        return this.request('/api/orders', {
            method: 'POST',
            body: JSON.stringify(order)
        });
    },

    requestRefill(orderId, medicineName) {
        return this.request(`/api/orders/${orderId}/refill-request`, {
            method: 'POST',
            body: JSON.stringify({ medicineName })
        });
    },

    dispatchRequest(notificationId) {
        return this.request(`/api/requests/${notificationId}/dispatch`, {
            method: 'POST'
        });
    },

    connectRealtime() {
        if (!this.token) return;
        this.disconnectRealtime();

        this.eventSource = new EventSource(`/api/data/stream?token=${encodeURIComponent(this.token)}`);
        this.eventSource.addEventListener('data-sync', (event) => {
            const payload = JSON.parse(event.data);
            DB.applySnapshot(payload.snapshot);
            app.handleRealtimeSync(payload.reason);
        });
        this.eventSource.onerror = () => {
            if (this.eventSource?.readyState === EventSource.CLOSED) {
                this.disconnectRealtime();
            }
        };
    },

    disconnectRealtime() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
};

const DB = {
    cache: {
        users: [],
        medicines: [],
        alerts: [],
        orders: [],
        notifications: [],
        sales: [],
        feedback: []
    },

    transformUser(user) {
        return {
            id: user.id,
            name: user.name || user.username,
            email: user.username,
            role: user.role,
            address: user.address || ''
        };
    },

    transformMedicine(medicine) {
        return {
            id: medicine.id,
            name: medicine.medicine,
            batchNo: medicine.batchNo || '',
            expiryDate: medicine.expiryDate ? String(medicine.expiryDate).slice(0, 10) : '',
            quantity: Number(medicine.quantity || 0),
            supplierId: medicine.supplierId ? String(medicine.supplierId) : '',
            imageUrl: medicine.imageUrl || '',
            price: Number(medicine.price || 0)
        };
    },

    transformOrder(order) {
        return {
            id: order.orderId,
            orderId: order.orderId,
            customerId: order.customerId,
            username: order.username,
            address: order.deliveryAddress,
            date: order.date ? new Date(order.date).toLocaleString() : '',
            status: order.status,
            totalPrice: Number(order.totalPrice || 0),
            items: Array.isArray(order.items) ? order.items : []
        };
    },

    transformAlert(notification) {
        return {
            id: notification.id,
            type: notification.type,
            message: notification.message,
            supplierId: notification.supplierId ? String(notification.supplierId) : '',
            date: notification.date ? new Date(notification.date).toLocaleDateString() : ''
        };
    },

    applySnapshot(snapshot) {
        this.cache.users = (snapshot.users || []).map((user) => this.transformUser(user));
        this.cache.medicines = (snapshot.stockData || []).map((medicine) => this.transformMedicine(medicine));
        this.cache.orders = (snapshot.orders || []).map((order) => this.transformOrder(order));
        this.cache.notifications = snapshot.notifications || [];
        this.cache.alerts = this.cache.notifications
            .filter((notification) => notification.type === 'EXPIRED' || notification.type === 'OUT_OF_STOCK')
            .map((notification) => this.transformAlert(notification));
        this.cache.sales = snapshot.salesData || [];
        this.cache.feedback = snapshot.feedbackData || [];
    },

    async load() {
        const snapshot = await API.fetchData();
        this.applySnapshot(snapshot);
        return this.cache;
    },

    get(collection) {
        return this.cache[collection] || [];
    }
};

const app = {
    currentUser: null,

    async init() {
        this.bindEvents();

        const savedSession = sessionStorage.getItem(SESSION_KEY);
        if (!savedSession) {
            this.showView('login-view');
            return;
        }

        try {
            const session = JSON.parse(savedSession);
            API.setToken(session.token);
            this.currentUser = session.user;
            await DB.load();
            this.refreshCurrentUser();
            API.connectRealtime();
            this.showView(this.currentUser.role.toLowerCase() + '-view');
            this.initRoleDashboard();
        } catch (error) {
            console.error('Session restore failed:', error);
            this.logout();
        }
    },

    bindEvents() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.login();
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.register();
        });
    },

    persistSession(token, user) {
        API.setToken(token);
        this.currentUser = user;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
    },

    refreshCurrentUser() {
        if (!this.currentUser) return;
        const updated = DB.get('users').find((user) => user.id === this.currentUser.id);
        if (updated) {
            this.currentUser = { ...this.currentUser, ...updated };
            const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
            session.user = this.currentUser;
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    },

    showRegister(e) {
        e.preventDefault();
        this.showView('register-view');
    },

    showLogin(e) {
        e.preventDefault();
        this.showView('login-view');
    },

    async login() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');

        try {
            const { token, user } = await API.login(email, password);
            this.persistSession(token, DB.transformUser(user));
            await DB.load();
            this.refreshCurrentUser();
            API.connectRealtime();

            errorEl.innerText = '';
            document.getElementById('login-form').reset();
            this.showView(this.currentUser.role.toLowerCase() + '-view');
            this.initRoleDashboard();
        } catch (error) {
            errorEl.innerText = error.message;
        }
    },

    async register() {
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const errorEl = document.getElementById('register-error');

        try {
            await API.register({ name, email, password });
            const { token, user } = await API.login(email, password);
            this.persistSession(token, DB.transformUser(user));
            await DB.load();
            this.refreshCurrentUser();
            API.connectRealtime();

            errorEl.innerText = '';
            document.getElementById('register-form').reset();
            this.showView('customer-view');
            this.initRoleDashboard();
        } catch (error) {
            errorEl.innerText = error.message;
        }
    },

    logout() {
        API.disconnectRealtime();
        API.setToken('');
        this.currentUser = null;
        sessionStorage.removeItem(SESSION_KEY);
        userCart = [];
        document.getElementById('main-header').style.display = 'none';
        this.showView('login-view');
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');

        if (viewId !== 'login-view' && viewId !== 'register-view' && this.currentUser) {
            document.getElementById('main-header').style.display = 'flex';
            document.getElementById('user-role-badge').innerText = this.currentUser.role;
            document.getElementById('user-greeting').innerText = `Hello, ${this.currentUser.name}`;
        } else {
            document.getElementById('main-header').style.display = 'none';
        }
    },

    initRoleDashboard() {
        if (!this.currentUser) return;

        if (this.currentUser.role === 'Admin') adminController.init();
        if (this.currentUser.role === 'Pharmacist') pharmacistController.init();
        if (this.currentUser.role === 'Supplier') supplierController.init();
        if (this.currentUser.role === 'Customer') customerController.init();
    },

    handleRealtimeSync() {
        if (!this.currentUser) return;
        this.refreshCurrentUser();
        this.showView(this.currentUser.role.toLowerCase() + '-view');
        if (this.currentUser.role === 'Admin') adminController.renderUsers();
        if (this.currentUser.role === 'Pharmacist') {
            pharmacistController.renderSuppliers();
            pharmacistController.renderMedicines();
            pharmacistController.renderRequests();
        }
        if (this.currentUser.role === 'Supplier') {
            supplierController.renderMedicines();
            supplierController.renderAlerts();
        }
        if (this.currentUser.role === 'Customer') {
            customerController.renderMedicines();
            customerController.renderOrderHistory();
            customerController.renderNotifications();
            customerController.updateCartCount();
        }
    }
};

const adminController = {
    init() {
        this.renderUsers();
        document.getElementById('add-user-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.addUser();
        };
    },

    renderUsers() {
        const users = DB.get('users');
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        users.forEach((user) => {
            tbody.innerHTML += `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="badge">${user.role}</span></td>
                    <td>
                        <button class="btn btn-danger" onclick="adminController.deleteUser(${user.id})" ${user.id === app.currentUser.id ? 'disabled' : ''}>Delete</button>
                    </td>
                </tr>
            `;
        });
    },

    openAddUserModal() {
        document.getElementById('add-user-modal').classList.add('show');
    },

    closeModal() {
        document.getElementById('add-user-modal').classList.remove('show');
    },

    async addUser() {
        const name = document.getElementById('new-user-name').value.trim();
        const email = document.getElementById('new-user-email').value.trim();
        const role = document.getElementById('new-user-role').value;
        const password = document.getElementById('new-user-password').value;

        try {
            await API.createUser({ name, email, role, password });
            await DB.load();
            this.closeModal();
            this.renderUsers();
            document.getElementById('add-user-form').reset();
        } catch (error) {
            alert(error.message);
        }
    },

    async deleteUser(id) {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            await API.deleteUser(id);
            await DB.load();
            this.renderUsers();
        } catch (error) {
            alert(error.message);
        }
    }
};

const pharmacistController = {
    init() {
        this.renderMedicines();
        this.renderSuppliers();
        this.renderRequests();
        document.getElementById('add-med-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.addMedicine();
        };
    },

    renderRequests() {
        const tbody = document.getElementById('pharmacist-requests-body');
        const requests = DB.get('notifications')
            .filter((notification) => notification.type === 'CUSTOMER_REQUEST')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = '';

        if (requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No customer requests yet.</td></tr>';
            return;
        }

        requests.forEach((request) => {
            const status = request.actionStatus === 'completed'
                ? '<span class="badge good">Sent</span>'
                : '<span class="badge low-stock">Pending</span>';
            const action = request.actionStatus === 'completed'
                ? '<span class="text-muted">Completed</span>'
                : `<button class="btn btn-primary" onclick="pharmacistController.dispatchMedicine(${request.id})">Send Medicine</button>`;

            tbody.innerHTML += `
                <tr>
                    <td>${request.username}</td>
                    <td>${request.medicineName || '-'}</td>
                    <td>${request.relatedOrderId || '-'}</td>
                    <td>${request.message}</td>
                    <td>${status}</td>
                    <td>${action}</td>
                </tr>
            `;
        });
    },

    renderSuppliers() {
        const suppliers = DB.get('users').filter((user) => user.role === 'Supplier');
        const select = document.getElementById('med-supplier');
        select.innerHTML = suppliers.map((supplier) => (
            `<option value="${supplier.id}">${supplier.name}</option>`
        )).join('');
    },

    renderMedicines() {
        const medicines = DB.get('medicines');
        const tbody = document.getElementById('medicines-table-body');
        const today = new Date().toISOString().slice(0, 10);
        tbody.innerHTML = '';

        medicines.forEach((medicine) => {
            let status = '<span class="badge good">Good</span>';
            if (medicine.expiryDate && medicine.expiryDate < today) {
                status = '<span class="badge expired">Expired</span>';
            } else if (medicine.quantity === 0) {
                status = '<span class="badge expired">Out of Stock</span>';
            } else if (medicine.quantity <= 5) {
                status = '<span class="badge low-stock">Low Stock</span>';
            }

            tbody.innerHTML += `
                <tr>
                    <td>${medicine.name}</td>
                    <td>${medicine.batchNo}</td>
                    <td>${medicine.expiryDate}</td>
                    <td>${medicine.quantity}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-danger" onclick="pharmacistController.deleteMedicine(${medicine.id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    },

    openAddMedicineModal() {
        document.getElementById('add-med-modal').classList.add('show');
    },

    closeModal() {
        document.getElementById('add-med-modal').classList.remove('show');
        document.getElementById('med-error').innerText = '';
    },

    async addMedicine() {
        const name = document.getElementById('med-name').value.trim();
        const batchNo = document.getElementById('med-batch').value.trim();
        const expiryDate = document.getElementById('med-expiry').value;
        const quantity = Number(document.getElementById('med-qty').value);
        const supplierId = document.getElementById('med-supplier').value;
        const errorEl = document.getElementById('med-error');

        try {
            await API.createMedicine({ name, batchNo, expiryDate, quantity, supplierId });
            await DB.load();
            this.closeModal();
            this.renderMedicines();
            this.renderSuppliers();
            document.getElementById('add-med-form').reset();
        } catch (error) {
            errorEl.innerText = error.message;
        }
    },

    async deleteMedicine(id) {
        if (!confirm('Delete medicine?')) return;

        try {
            await API.deleteMedicine(id);
            await DB.load();
            this.renderMedicines();
        } catch (error) {
            alert(error.message);
        }
    },

    async dispatchMedicine(notificationId) {
        try {
            await API.dispatchRequest(notificationId);
            await DB.load();
            this.renderRequests();
        } catch (error) {
            alert(error.message);
        }
    }
};

const supplierController = {
    init() {
        this.renderMedicines();
        this.renderAlerts();
    },

    renderMedicines() {
        const supplierId = String(app.currentUser.id);
        const medicines = DB.get('medicines').filter((medicine) => String(medicine.supplierId) === supplierId);
        const tbody = document.getElementById('supplier-medicines-body');
        const today = new Date().toISOString().slice(0, 10);
        tbody.innerHTML = '';

        if (medicines.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">You are not supplying any medicines currently.</td></tr>';
            return;
        }

        medicines.forEach((medicine) => {
            const qtyClass = medicine.quantity > 5 ? 'good' : (medicine.quantity > 0 ? 'low-stock' : 'expired');
            const expiryClass = medicine.expiryDate < today ? 'expired' : 'good';

            tbody.innerHTML += `
                <tr>
                    <td><strong>${medicine.name}</strong></td>
                    <td>${medicine.batchNo}</td>
                    <td><span class="badge ${expiryClass}">${medicine.expiryDate}</span></td>
                    <td><span class="badge ${qtyClass}">${medicine.quantity}</span></td>
                </tr>
            `;
        });
    },

    renderAlerts() {
        const supplierId = String(app.currentUser.id);
        const alerts = DB.get('alerts').filter((alertItem) => String(alertItem.supplierId) === supplierId);
        const container = document.getElementById('supplier-alerts-container');
        container.innerHTML = '';

        if (alerts.length === 0) {
            container.innerHTML = '<p class="text-muted">No alerts at this time.</p>';
            return;
        }

        alerts.slice().reverse().forEach((alertItem) => {
            const isWarning = alertItem.type === 'OUT_OF_STOCK';
            container.innerHTML += `
                <div class="alert-card ${isWarning ? 'warning' : ''}">
                    <div>
                        <p><strong>${alertItem.type} ALERT:</strong> ${alertItem.message}</p>
                    </div>
                    <div class="alert-date">${alertItem.date}</div>
                </div>
            `;
        });
    }
};

const customerController = {
    currentPage: 1,
    itemsPerPage: 5,
    searchQuery: '',

    init() {
        userCart = [];
        this.currentPage = 1;
        this.searchQuery = '';
        document.getElementById('med-search').value = '';
        document.getElementById('checkout-address').value = app.currentUser.address || '';
        this.updateCartCount();
        this.hideOrderHistory();
        this.renderMedicines();
        this.renderNotifications();
    },

    handleSearch() {
        this.searchQuery = document.getElementById('med-search').value.toLowerCase();
        this.currentPage = 1;
        this.renderMedicines();
    },

    nextPage() {
        this.currentPage += 1;
        this.renderMedicines();
    },

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage -= 1;
            this.renderMedicines();
        }
    },

    toggleHistory() {
        const isVisible = document.getElementById('customer-history-section').style.display === 'block';
        if (isVisible) this.hideOrderHistory();
        else this.showOrderHistory();
    },

    showOrderHistory() {
        document.getElementById('customer-browse-section').style.display = 'none';
        document.getElementById('customer-history-section').style.display = 'block';
        document.getElementById('toggle-history-btn').innerText = '← Back to Browse';
        this.renderOrderHistory();
    },

    hideOrderHistory() {
        document.getElementById('customer-browse-section').style.display = 'block';
        document.getElementById('customer-history-section').style.display = 'none';
        document.getElementById('toggle-history-btn').innerText = 'View Order History';
        this.renderMedicines();
    },

    renderMedicines() {
        const medicines = DB.get('medicines');
        const grid = document.getElementById('customer-medicine-grid');
        const today = new Date().toISOString().slice(0, 10);
        grid.innerHTML = '';

        let available = medicines.filter((medicine) => medicine.quantity > 0 && medicine.expiryDate >= today);
        if (this.searchQuery) {
            available = available.filter((medicine) => medicine.name.toLowerCase().includes(this.searchQuery));
        }

        const totalPages = Math.ceil(available.length / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        document.getElementById('page-indicator').innerText = `Page ${this.currentPage} of ${totalPages}`;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const pageItems = available.slice(start, start + this.itemsPerPage);

        if (pageItems.length === 0) {
            grid.innerHTML = '<p>No medicines matched your criteria.</p>';
            return;
        }

        pageItems.forEach((medicine) => {
            const image = medicine.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80';
            grid.innerHTML += `
                <div class="med-card">
                    <img src="${image}" alt="${medicine.name}" class="med-image">
                    <div class="med-name">${medicine.name}</div>
                    <div class="med-meta">
                        <div>Expires: ${medicine.expiryDate}</div>
                        <div>In Stock: <span class="badge good">${medicine.quantity}</span></div>
                    </div>
                    <div class="med-action">
                        <input type="number" id="qty-${medicine.id}" value="1" min="1" max="${medicine.quantity}" class="qty-input">
                        <button class="btn btn-outline" style="flex: 1;" onclick="customerController.addToCart(${medicine.id})">Add</button>
                    </div>
                </div>
            `;
        });
    },

    addToCart(id) {
        const medicine = DB.get('medicines').find((item) => item.id === id);
        if (!medicine) return;

        const requestedQty = Number(document.getElementById(`qty-${id}`).value);
        if (requestedQty < 1 || requestedQty > medicine.quantity) {
            alert('Invalid quantity requested!');
            return;
        }

        const existing = userCart.find((item) => item.id === id);
        if (existing) {
            if (existing.cartQty + requestedQty > medicine.quantity) {
                alert('Cannot add more than available stock to cart!');
                return;
            }
            existing.cartQty += requestedQty;
        } else {
            userCart.push({ ...medicine, cartQty: requestedQty });
        }

        this.updateCartCount();
        alert(`${requestedQty} x ${medicine.name} added to cart!`);
    },

    updateCartCount() {
        const total = userCart.reduce((sum, item) => sum + item.cartQty, 0);
        document.getElementById('cart-count').innerText = total;
    },

    openCartModal() {
        const tbody = document.getElementById('cart-table-body');
        tbody.innerHTML = '';

        if (userCart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Cart is empty</td></tr>';
        } else {
            userCart.forEach((item, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${item.name}</strong></td>
                        <td>${item.cartQty}</td>
                        <td><button class="btn btn-danger" onclick="customerController.removeFromCart(${index})">Remove</button></td>
                    </tr>
                `;
            });
        }

        document.getElementById('checkout-address').value = app.currentUser.address || '';
        document.getElementById('checkout-modal').classList.add('show');
    },

    closeCartModal() {
        document.getElementById('checkout-modal').classList.remove('show');
    },

    removeFromCart(index) {
        userCart.splice(index, 1);
        this.updateCartCount();
        this.openCartModal();
    },

    async confirmOrder() {
        if (userCart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        const address = document.getElementById('checkout-address').value.trim();
        if (!address) {
            alert('Please enter a delivery address');
            return;
        }

        try {
            await API.placeOrder({ items: userCart, address });
            await DB.load();

            userCart = [];
            this.updateCartCount();
            this.closeCartModal();
            this.renderMedicines();
            this.renderOrderHistory();
            this.renderNotifications();
            document.getElementById('checkout-address').value = '';

            alert('Order placed successfully! You can view it in your Order History.');
        } catch (error) {
            alert(error.message);
        }
    },

    getCustomerNotifications() {
        return DB.get('notifications')
            .filter((notification) =>
                notification.username === app.currentUser.email &&
                ['CUSTOMER_MEDICINE_EXPIRED', 'MEDICINE_SENT', 'ORDER_UPDATE'].includes(notification.type)
            )
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    renderNotifications() {
        const container = document.getElementById('customer-notifications-list');
        const notifications = this.getCustomerNotifications();
        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-muted">No customer alerts right now.</p>';
            return;
        }

        notifications.forEach((notification) => {
            const warning = notification.type === 'CUSTOMER_MEDICINE_EXPIRED';
            container.innerHTML += `
                <div class="alert-card ${warning ? 'warning' : ''}">
                    <div>
                        <p><strong>${notification.type.replaceAll('_', ' ')}:</strong> ${notification.message}</p>
                    </div>
                    <div class="alert-date">${new Date(notification.date).toLocaleString()}</div>
                </div>
            `;
        });
    },

    hasPendingRequest(orderId, medicineName) {
        return DB.get('notifications').some((notification) =>
            notification.type === 'CUSTOMER_REQUEST' &&
            notification.username === app.currentUser.email &&
            notification.relatedOrderId === orderId &&
            notification.medicineName === medicineName &&
            notification.actionStatus === 'pending'
        );
    },

    renderItemActions(order) {
        return order.items.map((item) => {
            const pending = this.hasPendingRequest(order.orderId, item.name);
            const buttonLabel = pending ? 'Request Sent' : 'Request Again';
            const disabled = pending ? 'disabled' : '';
            return `
                <div style="margin-bottom: 0.5rem;">
                    <button class="btn btn-outline" ${disabled} onclick="customerController.requestMedicine('${order.orderId}', '${String(item.name).replace(/'/g, "\\'")}')">${buttonLabel}: ${item.name}</button>
                </div>
            `;
        }).join('');
    },

    async requestMedicine(orderId, medicineName) {
        try {
            await API.requestRefill(orderId, medicineName);
            await DB.load();
            this.renderOrderHistory();
            this.renderNotifications();
            alert('Your request has been sent to the pharmacist.');
        } catch (error) {
            alert(error.message);
        }
    },

    renderOrderHistory() {
        const orders = DB.get('orders').filter((order) => Number(order.customerId) === Number(app.currentUser.id));
        const tbody = document.getElementById('order-history-body');
        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">You have absolutely no orders yet.</td></tr>';
            return;
        }

        orders.forEach((order) => {
            const summary = order.items.map((item) => `${item.cartQty}x ${item.name}`).join('<br>');
            const actions = this.renderItemActions(order);
            tbody.innerHTML += `
                <tr>
                    <td>#${order.orderId}</td>
                    <td>${order.date}</td>
                    <td>${order.address}</td>
                    <td><small>${summary}</small></td>
                    <td>${actions}</td>
                </tr>
            `;
        });
    }
};

window.app = app;
window.adminController = adminController;
window.pharmacistController = pharmacistController;
window.supplierController = supplierController;
window.customerController = customerController;
window.onload = () => app.init();
