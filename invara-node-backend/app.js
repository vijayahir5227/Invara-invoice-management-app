const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto"); // For MD5 hashing email

const app = express();
app.use(bodyParser.json());

// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://luharkaushik1234_db_user:aaJ77jeLyLib9J93@cluster0.fhdcymy.mongodb.net/",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema and Model
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

// Item Schema and Model
const itemSchema = new mongoose.Schema({
  productId: { type: String, unique: true, required: true },
  itemName: { type: String, unique: true },
  amount: Number,
  category: String,  
});
const Item = mongoose.model("Item", itemSchema);

// Invoice Schema and Model
const invoiceSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true },
  billDate: Number,
  partyName: String,
  items: [
    {
      itemName: String,
      quantity: Number,
      amount: Number,
      total: Number,
      category: String,
    },
  ],
  taxAmount: Number,
  paymentStatus: String,
  grandTotal: Number,
});
const Invoice = mongoose.model("Invoice", invoiceSchema);

// Helper: MD5 hash of email
function md5(email) {
  return crypto.createHash("md5").update(email).digest("hex");
}

// Signup API
app.post("/api/signup", async (req, res) => {
  try {
    let email = req.body.email.toLowerCase().replace(/\s+/g, ''); // remove spaces and lowercase
    
    // Split email into local part and domain part
    const [localPart, domainPart] = email.split("@");
    
    if (!domainPart) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    
    // Remove all non-alphanumeric characters from local part
    const cleanedLocal = localPart.replace(/[^a-z0-9]/g, '');
    
    // Rejoin cleaned email
    email = `${cleanedLocal}@${domainPart}`;
    
    req.body.email = email;

    // Check duplicate email explicitly
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = new User({ ...req.body });
    await user.save();
    res.json({ message: "Signup Successful" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Username or Email already exists" });
    }
    res.status(400).json({ error: err.message });
  }
});


// Login API
app.post("/api/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  try {
    const user = await User.findOne({ usernameOrEmail, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create Invoice API
app.post("/api/invoice/create", async (req, res) => {
  try {
    const invoice = new Invoice({ ...req.body });
    await invoice.save();
    res.json({ message: "Invoice created" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add Item API
app.post("/api/item/add", async (req, res) => {
  try {
    const item = new Item({ ...req.body });
    await item.save();
    res.json({ message: "Item added" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Item name must be unique" });
    }
    res.status(400).json({ error: err.message });
  }
});

// View Invoice API
app.get("/api/invoice/view", async (req, res) => {
  try {
    const invoices = await Invoice.find({});
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manage Invoice API (Edit)
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

// Change Password API (requires old password)
app.post("/api/user/change-password", async (req, res) => {
  const { usernameOrEmail, oldPassword, newPassword, confirmPassword } =
    req.body;
  if (newPassword !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });
  try {
    const user = await User.findOne({ usernameOrEmail, password: oldPassword });
    if (!user) return res.status(401).json({ error: "Old password incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View Item API
app.get("/api/item/view", async (req, res) => {
  try {
    const items = await Item.find({});
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/info", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email parameter is required" });

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


// Forget Password API - send reset link with email MD5 hash
app.post("/api/user/forget-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // Check if user exists with the given email
    const user = await User.findOne({ email });

    if (!user) {
      // User does not exist — respond clearly
      return res.json({
        exists: false,
        message: `User with email ${email} does not exist.`,
      });
    }

    // User exists, generate MD5 hash and reset link
    const emailHash = md5(email);
    const resetLink = `https://invara-backend.onrender.com/reset-password.html?emailHash=${emailHash}`;

    // Create Nodemailer transporter with Gmail SMTP and app password
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "shivamdigital850@gmail.com",
        pass: "pyms jkcu edbg ipxf", // Your Gmail app password
      },
    });

    // Email options
    const mailOptions = {
      from: '"shivam digital" <shivamdigital850@gmail.com>',
      to: email,
      subject: "Password Reset Link",
      html: `<p>Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>If you did not request this, please ignore this message.</p>`,
    };

    // Send reset email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);

    // Respond saying user exists and email sent
    res.json({
      exists: true,
      message: `Password reset link sent to ${email}.`,
    });
  } catch (err) {
    console.error("Error sending reset email:", err);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

// Serve static files (including reset-password.html)
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));


// Reset Password API (no old password needed, identified by emailHash)
app.post("/api/user/reset-password", async (req, res) => {
  const { emailHash, newPassword, confirmPassword } = req.body;
  if (!emailHash || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({
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

// Delete Invoice Api
app.delete("/api/invoice/delete/:billNumber", async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ billNumber: req.params.billNumber });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
