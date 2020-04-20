const net = require("net");
const parser = require("./parser");
const tracker = require("./tracker");
const Pieces = require("./pieces");

const {
  buildHandshake,
  parseHandshake,
  isHandshake,
  parseMessage,
  buildInterested,
} = require("./message");

const download = (peer, pieces, torrent) => {
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

  onWholeMessage(socket, (message) =>
    messageHandler(message, socket, peer, pieces)
  );
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

const messageHandler = (data, socket, peer, pieces) => {
  if (isHandshake(data)) {
    socket.write(buildInterested());
  } else {
    const startWork = () => {
      if (!peer.isWorking()) {
        requestPiece(socket, pieces, peer);
      }
    };

    const message = parseMessage(data);

    switch (message.id) {
      case 0:
        chokeHandler(peer);
        break;
      case 1:
        unchokeHandler(peer, startWork);
        break;
      case 4:
        haveHandler(message, peer, startWork);
        break;
      case 5:
        bitfieldHandler(message, peer, startWork);
        break;
      case 7:
        pieceHandler(message);
        break;
    }
  }
};

const chokeHandler = (peer) => {
  console.log("Received choke msg");
  console.log(peer);
  peer.choke();
};
const unchokeHandler = (peer, cb) => {
  console.log("Received unchoke msg");
  peer.unchoke();
  cb();
};
const haveHandler = (message, peer, cb) => {
  console.log(`Received have message`);
  const index = message.payload.readUInt32BE(0);
  peer.setPiece(index);
  cb();
};
const bitfieldHandler = (message, peer, cb) => {
  const bitfield = message.payload;
  console.log(`Received bitfield message`);

  bitfield.forEach((byte, i) => {
    for (j = 0; j < 8; j++) {
      const index = j + i * 8;
      if (byte % 2) peer.setPiece(index);
      byte = Math.floor(byte / 2);
    }
  });

  cb();
};

const pieceHandler = (message) => {
  console.log(`Received piece message`, message);
};

const requestPiece = (socket, pieces, peer) => {
  if (peer.isChoking()) return;
  console.log(`Requesting Piece...`);
};

module.exports = async (path) => {
  try {
    const torrent = parser.open(path);
    const peers = await tracker.getPeers(torrent);
    const pieces = new Pieces(torrent);
    peers.slice(0, 1).forEach((peer) => download(peer, pieces, torrent));
  } catch (err) {
    console.error(err);
  }
};
