const net = require("net");
const parser = require("./parser");
const tracker = require("./tracker");
const {
  buildHandshake,
  parseHandshake,
  isHandshake,
  parseMessage,
} = require("./message");

const download = (peer, torrent) => {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  const socket = net.createConnection(
    { port: peer.port, host: peer.ip },
    () => {
      console.log(`Connected to peer with ip ${peer.ip}. Writing handshake...`);
      socket.write(buildHandshake(torrent));
    }
  );

  socket.on("error", (e) => {
    console.log(e);
  });

  socket.on("end", () => {
    console.log("disconnected from peer");
  });

  onWholeMessage(socket, (message) => messageHandler(message, socket));
};

// Referenced https://allenkim67.github.io/programming/2016/05/04/how-to-make-your-own-bittorrent-client.html#grouping-messages
const onWholeMessage = (socket, callback) => {
  let workingBuffer = Buffer.alloc(0);
  let handshake = true;

  socket.on("data", (receivedBuffer) => {
    // msgLen calculates the length of a whole message
    const msgLen = () =>
      handshake
        ? workingBuffer.readUInt8(0) + 49
        : workingBuffer.readInt32BE(0) + 4;
    workingBuffer = Buffer.concat([workingBuffer, receivedBuffer]);

    while (workingBuffer.length >= 4 && workingBuffer.length >= msgLen()) {
      callback(workingBuffer.slice(0, msgLen()));
      workingBuffer = workingBuffer.slice(msgLen());
      handshake = false;
    }
  });
};

const messageHandler = (data) => {
  if (isHandshake(data)) {
    const handshakeResponse = parseHandshake(data);
    console.log("Handshake response: ", handshakeResponse);
  } else {
    const message = parseMessage(data);
    console.log("got msg");
    switch (message.id) {
      case 0:
        chokeHandler();
      case 1:
        unchokeHandler();
      case 4:
        haveHandler(message.payload);
      case 5:
        bitfieldHandler(message.payload);
      case 7:
        pieceHandler(message.payload);
    }
  }
};

const chokeHandler = () => {
  console.log(`Received choke message`);
};
const unchokeHandler = () => {
  console.log(`Received unchoke message`);
};
const haveHandler = () => {
  console.log(`Received have message`);
};
const bitfieldHandler = (payload) => {
  console.log(`Received bitfield message`);
};
const pieceHandler = (payload) => {
  console.log(`Received piece message`);
};

module.exports = async (path) => {
  try {
    const torrent = parser.open(path);
    const peers = await tracker.getPeers(torrent);
    peers.slice(0, 1).forEach((peer) => download(peer, torrent));
  } catch (err) {
    console.error(err);
  }
};
