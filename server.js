const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 100;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const users = new Map();
const messages = [];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  const guestName = `Guest ${socket.id.slice(0, 4)}`;

  users.set(socket.id, {
    id: socket.id,
    name: guestName,
    joinedAt: Date.now()
  });

  socket.emit("chat:history", messages);
  broadcastUsers();
  addSystemMessage(`${guestName} joined`);

  socket.on("user:setName", (name) => {
    const user = users.get(socket.id);
    if (!user) return;

    const nextName = cleanName(name) || guestName;
    const previousName = user.name;

    if (previousName === nextName) return;

    user.name = nextName;
    users.set(socket.id, user);
    broadcastUsers();
    addSystemMessage(`${previousName} is now ${nextName}`);
  });

  socket.on("chat:message", (text) => {
    const user = users.get(socket.id);
    const body = cleanMessage(text);

    if (!user || !body) return;

    const message = {
      id: `${Date.now()}-${socket.id}`,
      type: "user",
      userId: socket.id,
      name: user.name,
      text: body,
      sentAt: Date.now()
    };

    remember(message);
    io.emit("chat:message", message);
  });

  socket.on("chat:typing", (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.broadcast.emit("chat:typing", {
      userId: socket.id,
      name: user.name,
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    broadcastUsers();

    if (user) {
      addSystemMessage(`${user.name} left`);
    }
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
    console.error("Close the other chat server terminal, or run with another port:");
    console.error(`  PORT=${PORT + 1} npm start`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, HOST, () => {
  const urls = getLocalUrls(PORT);

  console.log(`LAN Chat is running on http://localhost:${PORT}`);
  if (urls.length) {
    console.log("Open from another device on the same network:");
    urls.forEach((url) => console.log(`  ${url}`));
  }
});

function cleanName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

function cleanMessage(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function remember(message) {
  messages.push(message);

  if (messages.length > MAX_HISTORY) {
    messages.splice(0, messages.length - MAX_HISTORY);
  }
}

function addSystemMessage(text) {
  const message = {
    id: `system-${Date.now()}`,
    type: "system",
    text,
    sentAt: Date.now()
  };

  remember(message);
  io.emit("chat:message", message);
}

function broadcastUsers() {
  io.emit("users:list", Array.from(users.values()));
}

function getLocalUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];

  Object.values(interfaces).forEach((addresses = []) => {
    addresses.forEach((address) => {
      if (address.family === "IPv4" && !address.internal) {
        urls.push(`http://${address.address}:${port}`);
      }
    });
  });

  return urls;
}
