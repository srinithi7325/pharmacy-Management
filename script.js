/**
 * Medics - Pharmacy Management System
 * Core State & Logic
 */

// --- Database (LocalStorage Wrapper) ---
const DB = {
    init() {
        if (!localStorage.getItem('users')) {
            const initialUsers = [
                { id: 1, name: 'Admin User', email: 'admin@medics.com', password: '1234', role: 'Admin' },
                { id: 2, name: 'John Pharmacist', email: 'pharm@medics.com', password: '1234', role: 'Pharmacist' },
                { id: 3, name: 'Medica Supplier', email: 'supp@medics.com', password: '1234', role: 'Supplier' },
                { id: 4, name: 'Jane Customer', email: 'cust@medics.com', password: '1234', role: 'Customer' },
            ];
            localStorage.setItem('users', JSON.stringify(initialUsers));
        }

        if (!localStorage.getItem('medicines')) {
            // Unsplash Images for visual fidelity
            const img1 = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80"; // Pills
            const img2 = "https://images.unsplash.com/photo-1550572017-ed3df23577d2?auto=format&fit=crop&w=400&q=80"; // Capsules
            const img3 = "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=400&q=80"; // Bottles

            const initialMeds = [
                { id: 101, name: "Paracetamol 500mg", batchNo: "B001", expiryDate: "2027-12-31", quantity: 500, supplierId: "3", imageUrl: img1 },
                { id: 102, name: "Amoxicillin 250mg", batchNo: "B002", expiryDate: "2026-08-15", quantity: 200, supplierId: "3", imageUrl: img2 },
                { id: 103, name: "Ibuprofen 400mg", batchNo: "B003", expiryDate: "2028-01-20", quantity: 350, supplierId: "3", imageUrl: img3 },
                { id: 104, name: "Cetirizine 10mg", batchNo: "B004", expiryDate: "2027-04-10", quantity: 150, supplierId: "3", imageUrl: img1 },
                { id: 105, name: "Azithromycin 500mg", batchNo: "B005", expiryDate: "2026-06-05", quantity: 100, supplierId: "3", imageUrl: img2 },
                { id: 106, name: "Vitamin C 1000mg", batchNo: "B006", expiryDate: "2028-05-30", quantity: 0, supplierId: "3", imageUrl: img3 }, // Out of stock example
                { id: 107, name: "Omeprazole 20mg", batchNo: "B007", expiryDate: "2027-11-11", quantity: 240, supplierId: "3", imageUrl: img1 },
                { id: 108, name: "Metformin 500mg", batchNo: "B008", expiryDate: "2025-01-10", quantity: 180, supplierId: "3", imageUrl: img2 }, // Expired example
                { id: 109, name: "Aspirin 75mg", batchNo: "B009", expiryDate: "2028-09-09", quantity: 400, supplierId: "3", imageUrl: img3 },
                { id: 110, name: "Loratadine 10mg", batchNo: "B010", expiryDate: "2027-02-14", quantity: 120, supplierId: "3", imageUrl: img1 },
                { id: 111, name: "Losartan 50mg", batchNo: "B011", expiryDate: "2026-10-22", quantity: 300, supplierId: "3", imageUrl: img2 },
                { id: 112, name: "Atorvastatin 20mg", batchNo: "B012", expiryDate: "2027-08-18", quantity: 280, supplierId: "3", imageUrl: img3 },
                { id: 113, name: "Amlodipine 5mg", batchNo: "B013", expiryDate: "2028-03-03", quantity: 220, supplierId: "3", imageUrl: img1 },
                { id: 114, name: "Metoprolol 50mg", batchNo: "B014", expiryDate: "2027-05-25", quantity: 160, supplierId: "3", imageUrl: img2 },
                { id: 115, name: "Pantoprazole 40mg", batchNo: "B015", expiryDate: "2028-07-07", quantity: 190, supplierId: "3", imageUrl: img3 },
                { id: 116, name: "Montelukast 10mg", batchNo: "B016", expiryDate: "2027-12-12", quantity: 140, supplierId: "3", imageUrl: img1 },
                { id: 117, name: "Escitalopram 10mg", batchNo: "B017", expiryDate: "2026-09-29", quantity: 110, supplierId: "3", imageUrl: img2 },
                { id: 118, name: "Sertraline 50mg", batchNo: "B018", expiryDate: "2028-11-11", quantity: 130, supplierId: "3", imageUrl: img3 },
                { id: 119, name: "Clopidogrel 75mg", batchNo: "B019", expiryDate: "2027-01-31", quantity: 170, supplierId: "3", imageUrl: img1 },
                { id: 120, name: "Rosuvastatin 10mg", batchNo: "B020", expiryDate: "2028-02-28", quantity: 210, supplierId: "3", imageUrl: img2 },
                { id: 121, name: "Ciprofloxacin 500mg", batchNo: "B021", expiryDate: "2026-07-15", quantity: 90, supplierId: "3", imageUrl: img3 },
                { id: 122, name: "Diclofenac 50mg", batchNo: "B022", expiryDate: "2027-06-20", quantity: 250, supplierId: "3", imageUrl: img1 },
                { id: 123, name: "Domperidone 10mg", batchNo: "B023", expiryDate: "2028-04-14", quantity: 320, supplierId: "3", imageUrl: img2 },
                { id: 124, name: "Levothyroxine 50mcg", batchNo: "B024", expiryDate: "2027-10-10", quantity: 260, supplierId: "3", imageUrl: img3 },
                { id: 125, name: "Folic Acid 5mg", batchNo: "B025", expiryDate: "2029-01-01", quantity: 450, supplierId: "3", imageUrl: img1 },
            ];
            localStorage.setItem('medicines', JSON.stringify(initialMeds));
        }

        if (!localStorage.getItem('alerts')) localStorage.setItem('alerts', JSON.stringify([]));
        if (!localStorage.getItem('orders')) localStorage.setItem('orders', JSON.stringify([]));
    },
    get(collection) {
        return JSON.parse(localStorage.getItem(collection)) || [];
    },
    set(collection, data) {
        localStorage.setItem(collection, JSON.stringify(data));
    },
    add(collection, item) {
        const data = this.get(collection);
        if(!item.id) item.id = Date.now();
        data.push(item);
        this.set(collection, data);
        return item;
    },
    update(collection, id, updates) {
        const data = this.get(collection);
        const index = data.findIndex(i => i.id == id);
        if(index > -1) {
            data[index] = { ...data[index], ...updates };
            this.set(collection, data);
        }
    },
    remove(collection, id) {
        let data = this.get(collection);
        data = data.filter(i => i.id != id);
        this.set(collection, data);
    }
};

// --- App State ---
const app = {
    currentUser: null,
    
    init() {
        DB.init();
        pharmacistController.checkAlerts();
        const storedUser = sessionStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            this.showView(this.currentUser.role.toLowerCase() + '-view');
            this.initRoleDashboard();
        } else {
            this.showView('login-view');
        }
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });
    },

    showRegister(e) { e.preventDefault(); this.showView('register-view'); },
    showLogin(e) { e.preventDefault(); this.showView('login-view'); },

    login() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        
        const users = DB.get('users');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            this.currentUser = user;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            errorEl.innerText = '';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            
            this.showView(user.role.toLowerCase() + '-view');
            this.initRoleDashboard();
        } else {
            errorEl.innerText = 'Invalid email or password';
        }
    },

    register() {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const errorEl = document.getElementById('register-error');

        const users = DB.get('users');
        if(users.find(u => u.email === email)) {
            errorEl.innerText = 'Email already registered. Please log in.';
            return;
        }

        const newUser = { name, email, password, role: 'Customer' };
        const savedUser = DB.add('users', newUser);
        
        this.currentUser = savedUser;
        sessionStorage.setItem('currentUser', JSON.stringify(savedUser));
        errorEl.innerText = '';
        document.getElementById('register-form').reset();
        
        this.showView('customer-view');
        this.initRoleDashboard();
    },

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        document.getElementById('main-header').style.display = 'none';
        this.showView('login-view');
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
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
        if(!this.currentUser) return;
        const role = this.currentUser.role;
        
        if(role === 'Admin') adminController.init();
        if(role === 'Pharmacist') pharmacistController.init();
        if(role === 'Supplier') supplierController.init();
        if(role === 'Customer') customerController.init();
    }
};

// --- Role Controllers ---

const adminController = {
    init() {
        this.renderUsers();
        document.getElementById('add-user-form').onsubmit = (e) => {
            e.preventDefault();
            this.addUser();
        };
    },
    renderUsers() {
        const users = DB.get('users');
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        users.forEach(u => {
            tbody.innerHTML += `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td><span class="badge">${u.role}</span></td>
                    <td>
                        <button class="btn btn-danger" onclick="adminController.deleteUser(${u.id})" ${u.id === app.currentUser.id ? 'disabled' : ''}>Delete</button>
                    </td>
                </tr>
            `;
        });
    },
    openAddUserModal() { document.getElementById('add-user-modal').classList.add('show'); },
    closeModal() { document.getElementById('add-user-modal').classList.remove('show'); },
    addUser() {
        const name = document.getElementById('new-user-name').value;
        const email = document.getElementById('new-user-email').value;
        const role = document.getElementById('new-user-role').value;
        const password = document.getElementById('new-user-password').value;
        
        if(DB.get('users').find(u => u.email === email)) {
            alert('Email already exists!');
            return;
        }

        DB.add('users', { name, email, role, password });
        this.closeModal();
        this.renderUsers();
        document.getElementById('add-user-form').reset();
    },
    deleteUser(id) {
        if(confirm('Are you sure you want to delete this user?')) {
            DB.remove('users', id);
            this.renderUsers();
        }
    }
};

const pharmacistController = {
    init() {
        this.renderMedicines();
        this.checkAlerts();
        
        const suppliers = DB.get('users').filter(u => u.role === 'Supplier');
        const sSelect = document.getElementById('med-supplier');
        sSelect.innerHTML = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        document.getElementById('add-med-form').onsubmit = (e) => {
            e.preventDefault();
            this.addMedicine();
        };
    },
    renderMedicines() {
        const meds = DB.get('medicines');
        const tbody = document.getElementById('medicines-table-body');
        tbody.innerHTML = '';
        const today = new Date().toISOString().split('T')[0];

        meds.forEach(m => {
            let status = '';
            let isExpired = m.expiryDate < today;
            let isLow = m.quantity <= 5 && m.quantity > 0;
            let isOut = m.quantity == 0;

            if(isExpired) status = '<span class="badge expired">Expired</span>';
            else if(isOut) status = '<span class="badge expired">Out of Stock</span>';
            else if(isLow) status = '<span class="badge low-stock">Low Stock</span>';
            else status = '<span class="badge good">Good</span>';

            tbody.innerHTML += `
                <tr>
                    <td>${m.name}</td>
                    <td>${m.batchNo}</td>
                    <td>${m.expiryDate}</td>
                    <td>${m.quantity}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-danger" onclick="pharmacistController.deleteMedicine(${m.id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    },
    checkAlerts() {
        const meds = DB.get('medicines');
        const alerts = DB.get('alerts');
        const today = new Date().toISOString().split('T')[0];
        
        meds.forEach(m => {
            let isExpired = m.expiryDate < today;
            let isOut = m.quantity == 0;
            
            if(isExpired || isOut) {
                const exists = alerts.find(a => a.medicineId === m.id && a.type === (isExpired ? 'EXPIRED' : 'OUT_OF_STOCK'));
                if(!exists) {
                    DB.add('alerts', {
                        medicineId: m.id,
                        medicineName: m.name,
                        supplierId: m.supplierId,
                        type: isExpired ? 'EXPIRED' : 'OUT_OF_STOCK',
                        message: `Medicine ${m.name} (Batch: ${m.batchNo}) is ${isExpired ? 'Expired' : 'Out of Stock'}. Please restock!`,
                        date: new Date().toLocaleDateString(),
                        read: false
                    });
                }
            }
        });
    },
    openAddMedicineModal() { document.getElementById('add-med-modal').classList.add('show'); },
    closeModal() { document.getElementById('add-med-modal').classList.remove('show'); document.getElementById('med-error').innerText=''; },
    addMedicine() {
        const name = document.getElementById('med-name').value;
        const batchNo = document.getElementById('med-batch').value;
        const expiryDate = document.getElementById('med-expiry').value;
        const quantity = parseInt(document.getElementById('med-qty').value);
        const supplierId = document.getElementById('med-supplier').value;
        const errorEl = document.getElementById('med-error');

        const meds = DB.get('medicines');
        if(meds.find(m => m.name.toLowerCase() === name.toLowerCase() && m.batchNo === batchNo)) {
            errorEl.innerText = "Error: Medicine with this Name and Batch No already exists.";
            return;
        }

        // Generic default image for new medicines added by Pharmacist
        const genericImage = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80";

        DB.add('medicines', { name, batchNo, expiryDate, quantity, supplierId, imageUrl: genericImage });
        this.closeModal();
        this.renderMedicines();
        this.checkAlerts();
        document.getElementById('add-med-form').reset();
    },
    deleteMedicine(id) {
        if(confirm('Delete medicine?')) {
            DB.remove('medicines', id);
            this.renderMedicines();
        }
    }
};

const supplierController = {
    init() {
        this.renderMedicines();
        this.renderAlerts();
    },
    renderMedicines() {
        const allMeds = DB.get('medicines');
        const supplierIdStr = String(app.currentUser.id);
        const myMeds = allMeds.filter(m => String(m.supplierId) === supplierIdStr);
        
        const tbody = document.getElementById('supplier-medicines-body');
        tbody.innerHTML = '';
        
        if (myMeds.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">You are not supplying any medicines currently.</td></tr>';
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        myMeds.forEach(m => {
            let qtBadge = `<span class="badge ${m.quantity > 5 ? 'good' : (m.quantity > 0 ? 'low-stock' : 'expired')}">${m.quantity}</span>`;
            let expBadge = `<span class="badge ${m.expiryDate < today ? 'expired' : 'good'}">${m.expiryDate}</span>`;
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${m.name}</strong></td>
                    <td>${m.batchNo}</td>
                    <td>${expBadge}</td>
                    <td>${qtBadge}</td>
                </tr>
            `;
        });
    },
    renderAlerts() {
        const alerts = DB.get('alerts').filter(a => String(a.supplierId) === String(app.currentUser.id));
        const container = document.getElementById('supplier-alerts-container');
        container.innerHTML = '';
        
        if(alerts.length === 0) {
            container.innerHTML = '<p class="text-muted">No alerts at this time.</p>';
            return;
        }

        alerts.slice().reverse().forEach(a => {
            const isWarning = a.type === 'OUT_OF_STOCK';
            container.innerHTML += `
                <div class="alert-card ${isWarning ? 'warning' : ''}">
                    <div>
                        <p><strong>${a.type} ALERT:</strong> ${a.message}</p>
                    </div>
                    <div class="alert-date">${a.date}</div>
                </div>
            `;
        });
    }
};

let userCart = [];
const customerController = {
    currentPage: 1,
    itemsPerPage: 5,
    searchQuery: "",

    init() {
        userCart = [];
        this.currentPage = 1;
        this.searchQuery = "";
        document.getElementById('med-search').value = "";
        this.updateCartCount();
        this.hideOrderHistory();
        this.renderMedicines();
    },

    handleSearch() {
        this.searchQuery = document.getElementById('med-search').value.toLowerCase();
        this.currentPage = 1;
        this.renderMedicines();
    },

    nextPage() {
        this.currentPage++;
        this.renderMedicines();
    },

    prevPage() {
        if(this.currentPage > 1) {
            this.currentPage--;
            this.renderMedicines();
        }
    },

    toggleHistory() {
        const isHistory = document.getElementById('customer-history-section').style.display === 'block';
        if(isHistory) {
            this.hideOrderHistory();
        } else {
            this.showOrderHistory();
        }
    },

    showOrderHistory() {
        document.getElementById('customer-browse-section').style.display = 'none';
        document.getElementById('customer-history-section').style.display = 'block';
        document.getElementById('toggle-history-btn').innerText = "← Back to Browse";
        this.renderOrderHistory();
    },

    hideOrderHistory() {
        document.getElementById('customer-browse-section').style.display = 'block';
        document.getElementById('customer-history-section').style.display = 'none';
        document.getElementById('toggle-history-btn').innerText = "View Order History";
        this.renderMedicines();
    },

    renderMedicines() {
        const meds = DB.get('medicines');
        const grid = document.getElementById('customer-medicine-grid');
        grid.innerHTML = '';
        
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Filter out-of-stock and expired
        let availableMeds = meds.filter(m => m.quantity > 0 && m.expiryDate >= today);

        // 2. Apply search filter
        if(this.searchQuery) {
            availableMeds = availableMeds.filter(m => m.name.toLowerCase().includes(this.searchQuery));
        }

        // 3. Setup Pagination (5 per page)
        const totalPages = Math.ceil(availableMeds.length / this.itemsPerPage) || 1;
        if(this.currentPage > totalPages) this.currentPage = totalPages;

        document.getElementById('page-indicator').innerText = `Page ${this.currentPage} of ${totalPages}`;

        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const pagedMeds = availableMeds.slice(startIdx, startIdx + this.itemsPerPage);

        if(pagedMeds.length === 0) {
            grid.innerHTML = '<p>No medicines matched your criteria.</p>';
            return;
        }

        pagedMeds.forEach(m => {
            const defaultImg = "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80";
            const img = m.imageUrl || defaultImg;

            grid.innerHTML += `
                <div class="med-card">
                    <img src="${img}" alt="${m.name}" class="med-image">
                    <div class="med-name">${m.name}</div>
                    <div class="med-meta">
                        <div>Expires: ${m.expiryDate}</div>
                        <div>In Stock: <span class="badge good">${m.quantity}</span></div>
                    </div>
                    <div class="med-action">
                        <input type="number" id="qty-${m.id}" value="1" min="1" max="${m.quantity}" class="qty-input">
                        <button class="btn btn-outline" style="flex: 1;" onclick="customerController.addToCart(${m.id})">Add</button>
                    </div>
                </div>
            `;
        });
    },

    addToCart(id) {
        const med = DB.get('medicines').find(m => m.id === id);
        if(!med) return;
        
        const reqQty = parseInt(document.getElementById(`qty-${id}`).value);

        if(reqQty < 1 || reqQty > med.quantity) {
            alert('Invalid quantity requested!');
            return;
        }

        const existing = userCart.find(i => i.id === id);
        if(existing) {
            if(existing.cartQty + reqQty <= med.quantity) {
                existing.cartQty += reqQty;
            } else {
                alert('Cannot add more than available stock to cart!');
                return;
            }
        } else {
            userCart.push({ ...med, cartQty: reqQty });
        }
        
        this.updateCartCount();
        alert(`${reqQty} x ${med.name} added to cart!`);
    },

    updateCartCount() {
        const total = userCart.reduce((sum, item) => sum + item.cartQty, 0);
        document.getElementById('cart-count').innerText = total;
    },

    openCartModal() {
        const tbody = document.getElementById('cart-table-body');
        tbody.innerHTML = '';
        
        if(userCart.length === 0) {
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
        document.getElementById('checkout-modal').classList.add('show');
    },

    closeCartModal() {
        document.getElementById('checkout-modal').classList.remove('show');
    },

    removeFromCart(index) {
        userCart.splice(index, 1);
        this.updateCartCount();
        this.openCartModal(); // Re-render inside modal
    },

    confirmOrder() {
        if(userCart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        const address = document.getElementById('checkout-address').value.trim();
        if(!address) {
            alert('Please enter a delivery address');
            return;
        }
        
        const meds = DB.get('medicines');
        userCart.forEach(cartItem => {
            const dbMed = meds.find(m => m.id === cartItem.id);
            if(dbMed) {
                dbMed.quantity -= cartItem.cartQty;
                DB.update('medicines', dbMed.id, { quantity: dbMed.quantity });
            }
        });

        // Save to order history
        DB.add('orders', {
            customerId: app.currentUser.id,
            items: userCart,
            address: address,
            date: new Date().toLocaleString()
        });
        
        userCart = [];
        this.updateCartCount();
        this.closeCartModal();
        this.renderMedicines();
        document.getElementById('checkout-address').value = "";
        
        pharmacistController.checkAlerts(); // Verify if out of stock alerts need to be triggered
        
        alert('Order placed successfully! You can view it in your Order History.');
    },

    renderOrderHistory() {
        const orders = DB.get('orders').filter(o => o.customerId === app.currentUser.id);
        const tbody = document.getElementById('order-history-body');
        tbody.innerHTML = '';

        if(orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">You have absolutely no orders yet.</td></tr>';
            return;
        }

        orders.slice().reverse().forEach(o => {
            const itemSummary = o.items.map(i => `${i.cartQty}x ${i.name}`).join('<br>');
            tbody.innerHTML += `
                <tr>
                    <td>#ORD-${o.id.toString().slice(-6)}</td>
                    <td>${o.date}</td>
                    <td>${o.address}</td>
                    <td><small>${itemSummary}</small></td>
                </tr>
            `;
        });
    }
};

// Start app on load
window.onload = () => app.init();