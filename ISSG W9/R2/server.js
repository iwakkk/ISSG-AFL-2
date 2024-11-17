const http = require("http");
const socketIo = require("socket.io");

const crypto = require('crypto');


const server = http.createServer();
const io = socketIo(server);

const users = new Map();

io.on("connection", (socket) => {
  console.log(`Client ${socket.id} connected`);

  socket.emit("init", Array.from(users.entries()));

  socket.on("registerPublicKey", (data) => {
    const { username, publicKey } = data;
    users.set(username, publicKey);
    console.log(`${username} registered with public key.`);

    io.emit("newUser", { username, publicKey });
  });

  socket.on("message", (data) => {
    const { username, message, signature } = data;
    console.log(`Received message from ${username}: ${message}`); 
    const publicKey = users.get(username);

    if (publicKey) {
        const verify = crypto.createVerify('SHA256');
        verify.update(message);
        verify.end();
        const isValid = verify.verify(publicKey, signature, 'hex');
        let fakeUser = false;
        if (isValid) {
          io.emit("message", { username, message, fakeUser: false }); // No impersonation
        } else {
          io.emit("message", { fakeUser: true, username, message: `${message} Warning: Message from ${username} failed verification. Fake user : `}); 
        }
      } else {
        io.emit("message", { fakeUser: true, username, message: `${message} Warning: Message from ${username} failed verification. Fake user : ` });
      }
  });

  socket.on("disconnect", () => {
    console.log(`Client ${socket.id} disconnected`);
  });
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});