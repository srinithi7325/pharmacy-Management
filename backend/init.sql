CREATE DATABASE IF NOT EXISTS medihub;
USE medihub;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    address TEXT,
    name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine VARCHAR(255) NOT NULL,
    batchNo VARCHAR(100),
    expiryDate DATE,
    quantity INT NOT NULL,
    supplierId INT,
    imageUrl TEXT,
    price DECIMAL(10, 2),
    manufactureDate DATE
);

CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine VARCHAR(255),
    quantity INT,
    price DECIMAL(10, 2),
    paymentMethod VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS orders (
    orderId VARCHAR(255) PRIMARY KEY,
    medicine TEXT,
    quantity INT,
    totalPrice DECIMAL(10, 2),
    username VARCHAR(255),
    deliveryAddress TEXT,
    paymentMethod VARCHAR(50),
    date DATETIME,
    status VARCHAR(50),
    customerId INT,
    items JSON
);

CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    message TEXT,
    date DATETIME
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT,
    date DATETIME,
    username VARCHAR(255),
    relatedOrderId VARCHAR(255),
    type VARCHAR(50),
    supplierId INT,
    isRead BOOLEAN DEFAULT FALSE,
    medicineName VARCHAR(255),
    actionStatus VARCHAR(50) DEFAULT 'pending'
);
