const net = require("net");
const cliProgress = require("cli-progress");
const parser = require("./parser");
const tracker = require("./tracker");
const Pieces = require("./pieces");

const {
  buildHandshake,
  parseHandshake,
  isHandshake,
  parseMessage,
  buildInterested,
  buildRequest,
} = require("./message");

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const download = (peer, pieces, torrent) => {
  const socket = net.createConnection(
    { port: peer.port, host: peer.ip },
    () => {
      socket.write(buildHandshake(torrent));
    }
  );

  socket.on("error", (e) => {
    //console.log(e);
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
    const message = parseMessage(data);

    switch (message.id) {
      case 0:
        chokeHandler(peer);
        break;
      case 1:
        unchokeHandler(peer, () => requestBlock(socket, pieces, peer));
        break;
      case 4:
        haveHandler(message, peer, () => requestBlock(socket, pieces, peer));
        break;
      case 5:
        bitfieldHandler(message, peer, () =>
          requestBlock(socket, pieces, peer)
        );
        break;
      case 7:
        pieceHandler(message, pieces, () => requestBlock(socket, pieces, peer));
        break;
    }
  }
};

const chokeHandler = (peer) => peer.choke();

const unchokeHandler = (peer, cb) => {
  peer.unchoke();
  cb();
};

const haveHandler = (message, peer, cb) => {
  const index = message.payload.readUInt32BE(0);
  peer.setPiece(index);
  cb();
};

const bitfieldHandler = (message, peer, cb) => {
  const bitfield = message.payload;

  bitfield.forEach((byte, i) => {
    for (j = 0; j < 8; j++) {
      const index = j + i * 8;
      if (byte % 2) peer.setPiece(index);
      byte = Math.floor(byte / 2);
    }
  });

  cb();
};

const pieceHandler = ({ payload }, pieces, cb) => {
  pieces.addReceived(payload);
  updateProgressBar(pieces);
  cb();
};

const requestBlock = (socket, pieces, peer) => {
  if (peer.isChoking()) return;

  const { queue } = pieces;

  while (queue.length) {
    let block = queue.shift();
    if (peer.hasPiece(block.index)) {
      socket.write(buildRequest(block.index, block.begin, block.length));
      pieces.addRequested(block);
      break;
    }
  }
};

const updateProgressBar = (pieces) => {
  bar.update(
    pieces.received.reduce((totalBlocks, blocks) => {
      return blocks.filter((i) => i).length + totalBlocks;
    }, 0)
  );
};

module.exports = async (path) => {
  try {
    const torrent = parser.open(path);
    const peers = await tracker.getPeers(torrent);
    const pieces = new Pieces(torrent);
    bar.start(pieces.queue.length, 0);
    peers.forEach((peer) => download(peer, pieces, torrent));
  } catch (err) {
    console.error(err);
  }
};
