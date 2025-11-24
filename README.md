# Invara -- Smart Invoice Management App

Invara is a fast, smart, and user-friendly invoice management
application designed to simplify billing for small and medium
businesses. With features like automatic total calculation, bilingual
printing, instant PDF generation, and item master management, Invara
ensures smooth and error-free invoicing.

The app is built using **Java**, **XML**, **Node.js**, and **MongoDB**,
offering stability, scalability, and fast data handling.

## 🚀 Features

-   **Create & Manage Invoices** Easy invoice creation with customer
    name, item list, tax, payment status, and automatic grand total.

-   **Instant Print & Share** Generate PDF invoices instantly and share
    them via any platform.

-   **Bilingual Printing** Supports invoice printing in **English** and
    **Gujarati**.

-   **Item Master Management** Store items with predefined rate,
    category, and product ID for quick selection.

-   **User Profile Management** Save and reuse company details like
    name, email, address, and mobile number.

-   **Filter & Search Invoices** Quickly find invoices by date,
    customer, amount, or status.

-   **Sales Analytics Dashboard** Visual charts for weekly sales,
    best-selling products, and item-wise breakdowns.

-   **Thermal Printer Support** Generate clean thermal print receipts.

-   **Full CRUD Operations** Create, Read, Update, Delete records for
    items, invoices, and user data.

## **🎥 Output Video / Demonstration**
[https://vimeo.com/1077059579](https://vimeo.com/1140001686?fl=tl&fe=ec)

## 🛠️ Tech Stack

### **Frontend (Android Mobile App)**

-   Java
-   XML
-   Android Studio

### **Backend**

-   Node.js
-   Express.js

### **Database**

-   MongoDB

## 📁 Project Structure

```
Invara/
│
├── invara-source-code/      # Android application source code
├── invara-node-backend/     # Backend API (Node.js + Express)
├── invara-db-json/          # JSON data for Database
└── README.md
```


## 🗄️ Data Models

### **User Profile**

| Field        | Description                  |
| ------------ | ---------------------------- |
| companyName  | Company name of the user     |
| fullName     | User's full name             |
| password     | User password                |
| mobileNumber | Contact number               |
| email        | User login email             |
| address      | Business/Residential address |
| createdAt    | Account creation timestamp   |

### **Item Master**

| Field     | Description               |
| --------- | ------------------------- |
| productId | Unique product identifier |
| itemName  | Name of the product       |
| amount    | Rate per item             |
| category  | Product category          |
| email     | Reference email           |


### **Invoice**

| Field         | Description                  |
| ------------- | ---------------------------- |
| billNumber    | Unique invoice number        |
| billDate      | Invoice creation date        |
| partyName     | Customer name                |
| email         | Associated user email        |
| items         | List of purchased items      |
| taxAmount     | Total tax amount             |
| paymentStatus | Payment status (Paid/Unpaid) |
| grandTotal    | Final total amount           |

## 📐 System Architecture

Invara follows the **Waterfall Model**, progressing through:

1.  Requirements Gathering
2.  System Design
3.  Implementation (Java + Node.js)
4.  Testing
5.  Deployment
6.  Maintenance

## ⚙️ Installation Guide

### **1. Clone the Repository**

``` bash
git clone https://github.com/vijayahir5227/Invara-invoice-management-app.git
```

### **2. Open Mobile App in Android Studio**

-   Import project
-   Let Gradle sync
-   Run on device or emulator

### **3. Install Server Dependencies**

``` bash
cd Invara/invara-node-backend
npm install
```

### **4. Start Backend Server**

``` bash
node app.js
```

## 🚀 Future Enhancements

-   Online payment gateway integration
-   Multi-user role system
-   SMS / Email notifications
-   Advanced analytics dashboard
-   Barcode scanning
-   Inventory management
-   Android + iOS native apps

## 👨‍💻 Project Members

-   **Kaushik Luhar**
-   **Baradiya Vijay**
-   **Kapdi Siddharth**

## 📄 License

This project is licensed under the **MIT License**.
