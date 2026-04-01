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
This app now uses the Node/Express backend plus MySQL for shared realtime data.

1. Clone the repository.
2. Run the SQL in `backend/init.sql` to create the `medihub` database and tables.
3. Update the MySQL credentials inside `backend/server.js`.
4. Install dependencies with `npm install`.
5. Start the app with `npm start`.
6. Open `http://localhost:3000` in your browser.

## Real-Time MySQL Backend
`backend/server.js` now includes a live data stream on top of MySQL using Server-Sent Events (SSE).

1. Create the MySQL schema with `backend/init.sql`.
2. Update the MySQL credentials inside `backend/server.js`.
3. Start the backend with `npm start`.
4. Log in through `/api/login` to receive a JWT.
5. Fetch the current snapshot from `/api/data`.
6. Subscribe to `/api/data/stream` to receive `data-sync` events whenever data changes.

## Project Structure
- `frontend/`: browser files like `index.html`, `script.js`, `style.css`
- `backend/`: Express server and SQL schema
- `server.js`: small compatibility entry file that forwards to `backend/server.js`

Example client flow:

```js
const token = 'YOUR_JWT_TOKEN';

const snapshot = await fetch('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

const stream = new EventSource(`/api/data/stream?token=${encodeURIComponent(token)}`);

stream.addEventListener('data-sync', (event) => {
  const { reason, snapshot } = JSON.parse(event.data);
  console.log('Live update:', reason, snapshot);
});
```


## 🔑 Demo Accounts
The system automatically signs these accounts up on the first load:
* **Admin:** `admin@medics.com`
* **Pharmacist:** `pharm@medics.com`
* **Supplier:** `supp@medics.com`
* **Customer:** `cust@medics.com`
*(Password for all default accounts is `1234`)*
