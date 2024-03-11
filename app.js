const express = require("express");
const http = require("http");
const ejs = require("ejs");
const socketIo = require("socket.io");
const QRCode = require("qrcode");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = 3000;
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const csvtojson = require("csvtojson");
// const twilio = require("twilio");
// const dotenv = require("dotenv");
// dotenv.config();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/asset", express.static(path.join(__dirname, "asset")));
app.set("view engine", "ejs");
app.set("views", "views");

const { ObjectId } = require("mongodb");
const mongo_URI =
  "mongodb+srv://rahul:NLemfFlHKjv8oBTK@cluster0.arscchm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const userSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: false,
  },
  isAttended: {
    type: Boolean,
    default: false,
  },
  position: {
    type: String,
    required: false,
  },
});

const Users = mongoose.model("Users", userSchema);

// Main Colletion for QR Scanning
const usertwoSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  isAttended: {
    type: Boolean,
    default: false,
  },
});
const Usertwo = mongoose.model("users", usertwoSchema);

mongoose
  .connect(mongo_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => {
    // Connected to the MongoDB database
    console.log("Connected to the MongoDB database");
  })
  .catch((error) => {
    console.error("Error connecting to the MongoDB database:", error);
  });

app.get("/", (req, res) => {
  res.render("home", { qrCodeData: null });
});

app.get("/welcome", (req, res) => {
  res.render("welcome");
});

app.get("/getCount", (req, res) => {
  res.render("getCount");
});

//It'll genearte QR using UserID
app.post("/generate", async (req, res) => {
  console.log(req.body.qrText);
  const qrText = req.body.qrText;
  try {
    const qrCodeData = await QRCode.toDataURL(qrText);
    res.render("home", { qrCodeData });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.post("/get-user-count", async (req, res) => {
  User.find({ isAttended: true });
  User.countDocuments({ isAttended: true })
    .then((count) => {
      console.log("Count of isAttended: ", count);
      res.status(201).json({ count: count });
    })
    .catch((error) => {
      console.error("Error: ", error);
      res.status(500).json({ error: "Invalid User" });
    });
});
//Ftech User using uniqueCode
app.post("/get-user-search", async (req, res) => {
  const code = req.body.uniqueCode;
  console.log(req.body.uniqueCode, "code");

  // const user = await User.findOne(  {code: { $regex: new RegExp(code, 'i') }})  ;
  const user = await Users.findOne({ _id: new ObjectId(code) });
  // console.log(user);
  if (!user) {
    console.log("here" + user);
    res.status(500).json({ error: "Invalid User" });
  }
  if (user) {
    if (user.isAttended == false) {
      console.log(user);

      await Users.findOneAndUpdate(
        { _id: user._id },
        { $set: { isAttended: true } },
        { new: true }
      )
        .then(() => {
          res.status(201).json(user);
        })
        .catch(() => {
          res.status(500).json({ error: "Invalid User" });
        });
    } else {
      res.status(400).json({ error: "QR Code has already been used" });
    }
  } else {
    res.status(500).json({ error: "Invalid User" });
  }
});

app.post("/get-user-scan", async (req, res) => {
  const code = req.body.uniqueCode;
  try {
    const user = await Users.findOne({ _id: new ObjectId(code) });
    if (user) {
      if (!user.isAttended) {
        // Logic to mark the user as attended
        const updatedUser = await Users.findOneAndUpdate(
          { _id: user._id },
          { $set: { isAttended: true } },
          { new: true }
        );
        console.log("User name:", updatedUser.name); // Console log the user's name on the server side

        // Send the user's name in the response
        res.json({
          success: true,
          name: updatedUser.name,
          position: updatedUser.position,
        });
      } else {
        // Handle the case where the QR code has already been used
        res
          .status(400)
          .json({ success: false, message: "QR Code already used" });
      }
    } else {
      // Handle user not found scenario
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    // Handle any other errors
    res
      .status(500)
      .json({ success: false, message: "Error processing request" });
  }
});

//Get users-list

io.on("connection", (socket) => {
  console.log("connected");
});

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
