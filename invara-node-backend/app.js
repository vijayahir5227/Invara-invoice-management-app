const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");
const { body, validationResult } = require("express-validator");

const app = express();
app.use(bodyParser.json());

// MongoDB Connection
mongoose
  .connect(
    "mongodb://127.0.0.1:27017/invara",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ================== Schemas & Models ==================

// User Schema
const userSchema = new mongoose.Schema({
  companyName: String,
  fullName: String,
  password: String,
  mobileNumber: String,
  email: { type: String, unique: true },
  address: String,
  createdAt: { type: Number, default: () => Date.now() },
});
const User = mongoose.model("User", userSchema);

// Item Schema (Updated to include taxPercentage)
const itemSchema = new mongoose.Schema({
  productId: { type: String, unique: true, required: true },
  itemName: { type: String, unique: true },
  amount: Number,
  category: String,
  taxPercentage: { type: Number, default: 0 },  // New field for tax percentage
  email: String
});
const Item = mongoose.model("Item", itemSchema);

// Invoice Schema (Uses updated item schema array)
const invoiceSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true },
  billDate: Number,
  partyName: String,
  email: String,
  items: [
    {
      itemName: String,
      quantity: Number,
      amount: Number,
      total: Number,
      category: String,
      taxPercentage: { type: Number, default: 0 }  // Include taxPercentage in invoice items as well
    },
  ],
  paymentStatus: String,
  taxAmount: Number,
  grandTotal: Number,
});
const Invoice = mongoose.model("Invoice", invoiceSchema);

// ================== Helpers ==================
function md5(email) {
  return crypto.createHash("md5").update(email).digest("hex");
}

// ================== APIs ==================

// Signup
app.post("/api/signup", async (req, res) => {
  try {
    let email = req.body.email.toLowerCase().replace(/\s+/g, "");

    const [localPart, domainPart] = email.split("@");
    if (!domainPart) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const cleanedLocal = localPart.replace(/[^a-z0-9]/g, "");
    email = `${cleanedLocal}@${domainPart}`;
    req.body.email = email;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = new User({ ...req.body });
    await user.save();

    res.json({ message: "Signup successful" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create Invoice
app.post("/api/invoice/create", async (req, res) => {
  try {
    const invoice = new Invoice({ ...req.body });
    await invoice.save();
    res.json({ message: "Invoice created" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add Item
app.post("/api/item/add", async (req, res) => {
  try {
    const item = new Item({ ...req.body });
    await item.save();
    res.json({ message: "Item added" });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "Item name or productId must be unique" });
    }
    res.status(400).json({ error: err.message });
  }
});

// View Invoices
app.post("/api/invoice/view", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    const invoices = await Invoice.find({ email });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get latest invoice number with prefix "INV"
app.post('/api/invoice/latestNumber', 
  body('email').isEmail().withMessage('Valid email required'), 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const email = req.body.email.toLowerCase();

      const latestInvoice = await Invoice.aggregate([
        { $match: { email } },
        {
          $addFields: {
            billNumberInt: {
              $toInt: { $substr: ["$billNumber", 3, -1] }
            }
          }
        },
        { $sort: { billNumberInt: -1 } },
        { $limit: 1 }
      ]);

      let latestBillNumber = "INV000";
      if (latestInvoice.length > 0 && latestInvoice[0].billNumber) {
        latestBillNumber = latestInvoice[0].billNumber;
      }

      res.json({ latestBillNumber });

    } catch (err) {
      console.error('Error fetching latest invoice number:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get latest product id 
app.post("/api/item/latestProductId", 
  body("email").isEmail().withMessage("Valid email required"), 
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const email = req.body.email.toLowerCase();

      const latestItem = await Item.aggregate([
        { $match: { email } },
        {
          $addFields: {
            productIdInt: {
              $toInt: { $substr: ["$productId", 4, -1] }  // strip "PROD" prefix starting at index 4
            }
          }
        },
        { $sort: { productIdInt: -1 } },
        { $limit: 1 }
      ]);

      let latestProductId = "PROD000";
      if (latestItem.length > 0 && latestItem[0].productId) {
        latestProductId = latestItem[0].productId;
      }

      res.json({ latestProductId });

    } catch (err) {
      console.error("Error fetching latest product ID:", err);
      res.status(500).json({ error: "Internal server error" });
    }
});

// Manage Invoice (Edit)
app.put("/api/invoice/manage/:billNumber", async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { billNumber: req.params.billNumber },
      req.body,
      { new: true }
    );
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.json({ message: "Invoice updated", invoice });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Change Password
app.post("/api/user/change-password", async (req, res) => {
  const { email, oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    const user = await User.findOne({ email, password: oldPassword });
    if (!user) return res.status(401).json({ error: "Old password incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View Items
app.post("/api/item/view", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    const items = await Item.find({ email });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Info
app.get("/api/user/info", async (req, res) => {
  const { email } = req.query;
  if (!email)
    return res.status(400).json({ error: "Email parameter is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userInfo = {
      companyName: user.companyName,
      fullName: user.fullName,
      mobileNumber: user.mobileNumber,
      email: user.email,
      address: user.address,
    };

    res.json(userInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forget Password
app.post("/api/user/forget-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        exists: false,
        message: `User with email ${email} does not exist.`,
      });
    }

    const emailHash = md5(email);
    const resetLink = `https://invara-backend.onrender.com/reset-password.html?emailHash=${emailHash}`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "shivamdigital850@gmail.com",
        pass: "pyms jkcu edbg ipxf", 
      },
    });

    const mailOptions = {
      from: '"shivam digital" <shivamdigital850@gmail.com>',
      to: email,
      subject: "Password Reset Link",
      html: `<p>Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>If you did not request this, please ignore this message.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      exists: true,
      message: `Password reset link sent to ${email}.`,
    });
  } catch (err) {
    console.error("Error sending reset email:", err);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Reset Password
app.post("/api/user/reset-password", async (req, res) => {
  const { emailHash, newPassword, confirmPassword } = req.body;

  if (!emailHash || !newPassword || !confirmPassword) {
    return res.status(400).json({
      error: "Email hash, new password and confirmation are required",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    const users = await User.find({});
    const user = users.find((u) => md5(u.email) === emailHash);

    if (!user) {
      return res.status(400).json({ error: "Invalid password reset link" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Delete Invoice
app.delete("/api/invoice/delete/:billNumber", async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      billNumber: req.params.billNumber,
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
