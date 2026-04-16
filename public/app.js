const socket = io();

const nameForm = document.querySelector("#nameForm");
const nameInput = document.querySelector("#nameInput");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const messagesEl = document.querySelector("#messages");
const userList = document.querySelector("#userList");
const onlineCount = document.querySelector("#onlineCount");
const connectionStatus = document.querySelector("#connectionStatus");
const typingStatus = document.querySelector("#typingStatus");

const storageKey = "lan-chat-name";
const typingUsers = new Map();
let typingTimer = null;

nameInput.value = localStorage.getItem(storageKey) || "";

socket.on("connect", () => {
  setConnection("Connected", true);

  if (nameInput.value.trim()) {
    socket.emit("user:setName", nameInput.value);
  }
});

socket.on("disconnect", () => {
  setConnection("Reconnecting", false);
});

socket.on("chat:history", (messages) => {
  messagesEl.replaceChildren();
  messages.forEach(addMessage);
  scrollMessages();
});

socket.on("chat:message", (message) => {
  addMessage(message);
  scrollMessages();
});

socket.on("users:list", (users) => {
  onlineCount.textContent = users.length;
  userList.replaceChildren(...users.map(renderUser));
});

socket.on("chat:typing", ({ userId, name, isTyping }) => {
  if (isTyping) {
    typingUsers.set(userId, name);
  } else {
    typingUsers.delete(userId);
  }

  renderTyping();
});

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();

  localStorage.setItem(storageKey, name);
  socket.emit("user:setName", name);
  messageInput.focus();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});

messageInput.addEventListener("input", () => {
  autoSizeMessageInput();
  socket.emit("chat:typing", messageInput.value.trim().length > 0);

  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit("chat:typing", false);
  }, 900);
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();

  if (!text) return;

  socket.emit("chat:message", text);
  socket.emit("chat:typing", false);
  messageInput.value = "";
  autoSizeMessageInput();
}

function addMessage(message) {
  const item = document.createElement("li");

  if (message.type === "system") {
    item.className = "message system";
    item.textContent = message.text;
    messagesEl.appendChild(item);
    return;
  }

  item.className = `message${message.userId === socket.id ? " mine" : ""}`;

  const meta = document.createElement("div");
  meta.className = "meta";

  const name = document.createElement("span");
  name.textContent = message.userId === socket.id ? "You" : message.name;

  const time = document.createElement("time");
  time.dateTime = new Date(message.sentAt).toISOString();
  time.textContent = formatTime(message.sentAt);

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = message.text;

  meta.append(name, time);
  item.append(meta, text);
  messagesEl.appendChild(item);
}

function renderUser(user) {
  const item = document.createElement("li");
  item.className = "user";

  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.textContent = initials(user.name);

  const name = document.createElement("span");
  name.textContent = user.id === socket.id ? `${user.name} (you)` : user.name;

  item.append(avatar, name);
  return item;
}

function renderTyping() {
  const names = Array.from(typingUsers.values()).slice(0, 2);

  if (!names.length) {
    typingStatus.textContent = "";
    return;
  }

  typingStatus.textContent =
    names.length === 1 ? `${names[0]} is typing` : `${names.join(", ")} are typing`;
}

function setConnection(text, isOnline) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle("offline", !isOnline);
}

function formatTime(value) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function autoSizeMessageInput() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

function scrollMessages() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
