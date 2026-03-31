# Medics - Pharmacy Management System 💊

Medics is a fully functional, front-end Single Page Application (SPA) designed to streamline pharmacy operations. It features robust role-based access control, real-time inventory tracking, and a complete e-commerce checkout flow for customers. The application utilizes the browser's `LocalStorage` to seamlessly simulate a persistent backend database without requiring a server setup.

## 🌟 Features by Role

### 🛒 Customer
- **Authentication**: Can independently register and log in to their account.
- **Dynamic Browse**: Displays available medicines with high-quality images, prices, and stock indicators.
- **Advanced Search & Pagination**: Instantly filter medicines by name. Results are paginated (5 items/page) for optimal UX.
- **Cart & Checkout**: Interactive shopping cart with quantity validation, address input, and order confirmation.
- **Order History**: Dedicated dashboard mapping past orders and delivery addresses.

### ⚕️ Pharmacist
- **Inventory Control**: Rigorous data validation preventing duplicate medicine names/batches.
- **Automated Alerts**: System actively monitors expiry dates and stock levels, autonomously generating alerts for Suppliers when medicine expires or runs out of stock.
- **Categorization**: Visual badging for "Good", "Low Stock", "Out of Stock", and "Expired" statuses.

### 📦 Supplier
- **Logistics Dashboard**: Tracks every supplied medicine alongside real-time global systemic stock levels and expiry dates.
- **Alert System**: Chronological alert feed flagging specific batches requiring restocking or removal.

### 👑 Admin
- **User Management**: Centralized dashboard to view, add, assign roles to, or delete system users across the entire application.

## 🛠️ Technology Stack
* **HTML5**: Semantic UI structure and modal handling.
* **CSS3**: Modern "Glassmorphism" aesthetic, CSS variables for light-mode theming, fluid micro-animations, and responsive design.
* **Vanilla JavaScript (ES6)**: 
  * Class-based state controllers (`adminController`, `pharmacistController`, etc.).
  * Custom `LocalStorage` ORM/Wrapper (`DB.init`, `DB.add`, `DB.update`) mimicking a document database.
  * Real-time DOM manipulation and rendering.

## 🚀 How to Run Locally
Because this application relies entirely on Vanilla Javascript and LocalStorage, there is zero setup required.
1. Clone the repository.
2. Open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari).
3. The database will automatically seed with **4 default user accounts** and **25 distinct medicines**.


## 🔑 Demo Accounts
The system automatically signs these accounts up on the first load:
* **Admin:** `admin@medics.com`
* **Pharmacist:** `pharm@medics.com`
* **Supplier:** `supp@medics.com`
* **Customer:** `cust@medics.com`
*(Password for all default accounts is `1234`)*