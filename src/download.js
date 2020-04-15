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

  onWholeMessage(socket, (message) => messageHandler(message, socket, peer));
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

const messageHandler = (data, socket, peer) => {
  if (isHandshake(data)) {
    const handshakeResponse = parseHandshake(data);
    console.log("Handshake response: ", handshakeResponse);
  } else {
    const message = parseMessage(data);

    switch (message.id) {
      case 0:
        chokeHandler(peer);
        break;
      case 1:
        unchokeHandler(peer);
        break;
      case 4:
        haveHandler(message);
        break;
      case 5:
        bitfieldHandler(message, peer);
        break;
      case 7:
        pieceHandler(message);
        break;
    }
  }
};

const chokeHandler = (peer) => {
  peer.peerChoking = 1;
};
const unchokeHandler = (peer) => {
  peer.peerChoking = 0;
};
const haveHandler = (message, peer) => {
  console.log(`Received have message`);
  peer.has.push(message.payload.readUInt32BE(0));
};
const bitfieldHandler = (message, peer) => {
  const bitfield = message.payload;
  console.log(`Received bitfield message`);

  bitfield.forEach((byte, i) => {
    for (j = 0; j < 8; j++) {
      if (byte % 2) peer.has.push(j + i * 8);
      byte = Math.floor(byte / 2);
    }
  });

  console.log(peer.has.length);
};

const pieceHandler = (message) => {
  console.log(`Received piece message`, message);
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
