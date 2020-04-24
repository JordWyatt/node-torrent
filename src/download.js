const fs = require("fs");
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

const download = (peer, pieces, torrent, file) => {
  const socket = net.createConnection({ port: peer.port, host: peer.ip });

  socket.on("connect", () => {
    socket.write(buildHandshake(torrent));
  });

  // attempt reconnect on failed
  socket.on("close", () => {
    setTimeout(function () {
      peer.initialise();
      socket.connect(peer.port, peer.ip);
    }, 5000);
  });

  socket.on("error", (e) => {
    //console.log(e);
  });

  onWholeMessage(socket, peer, (message) =>
    messageHandler(message, socket, peer, pieces, file, torrent)
  );
};

// Referenced https://allenkim67.github.io/programming/2016/05/04/how-to-make-your-own-bittorrent-client.html#grouping-messages
const onWholeMessage = (socket, peer, callback) => {
  let workingBuffer = Buffer.alloc(0);

  socket.on("data", (receivedBuffer) => {
    // msgLen calculates the length of a whole message
    const msgLen = () =>
      peer.isHandshakeComplete()
        ? workingBuffer.readInt32BE(0) + 4
        : workingBuffer.readUInt8(0) + 49;

    workingBuffer = Buffer.concat([workingBuffer, receivedBuffer]);

    while (workingBuffer.length >= 4 && workingBuffer.length >= msgLen()) {
      callback(workingBuffer.slice(0, msgLen()));
      workingBuffer = workingBuffer.slice(msgLen());
      peer.completeHandshake();
    }
  });
};

const messageHandler = (data, socket, peer, pieces, file, torrent) => {
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
        pieceHandler(message, pieces, file, torrent, socket, peer, () =>
          requestBlock(socket, pieces, peer)
        );
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

const pieceHandler = ({ payload }, pieces, file, torrent, socket, peer, cb) => {
  pieces.addReceived(payload);
  updateProgressBar(pieces);
  writeBlock(file, torrent, payload, () => {
    if (pieces.isDone()) {
      // verifyHash(file, torrent);
      bar.stop();
      console.log("Completed Download");
      fs.copyFileSync(file);
      socket.end();
    } else {
      cb();
    }
  });
};

const writeBlock = (file, torrent, { index, begin, block }, cb) => {
  const offset = index * torrent.info["piece length"] + begin;
  fs.write(file, block, 0, block.length, offset, cb);
};

const requestBlock = (socket, pieces, peer) => {
  if (peer.isChoking()) return;

  const { queue } = pieces;

  while (queue.length) {
    let block = queue.shift();
    if (peer.hasPiece(block.index)) {
      socket.write(buildRequest(block.index, block.begin, block.length));
      pieces.addRequested(block);
      setTimeout(() => {
        if (pieces.isNeeded(block)) {
          console.log("Block failed to DL after 10s, adding to queue");
          queue.push(block);
        }
      }, 30000);
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
    const file = fs.openSync(torrent.info.name, "w");
    const peers = await tracker.getPeers(torrent);
    const pieces = new Pieces(torrent);
    bar.start(pieces.queue.length, 0);
    console.log(peers.length);
    peers.forEach((peer) => download(peer, pieces, torrent, file));
  } catch (err) {
    console.error(err);
  }
};
