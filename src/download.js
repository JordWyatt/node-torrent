const fs = require("fs");
const crypto = require("crypto");
const net = require("net");
const cliProgress = require("cli-progress");
const parser = require("./parser");
const tracker = require("./tracker");
const Pieces = require("./pieces");
const CONNECTION_RETRY_LIMIT = 3;

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
  let connectionAttempts = 0;
  const socket = net.createConnection({ port: peer.port, host: peer.ip });

  socket.on("connect", () => {
    socket.write(buildHandshake(torrent));
  });

  // attempt reconnect on failed
  socket.on("close", () => {
    if (!connectionAttempts > CONNECTION_RETRY_LIMIT) {
      setTimeout(function () {
        peer.initialise();
        socket.connect(peer.port, peer.ip);
      }, 5000);
    } else {
      socket.end();
    }
  });

  socket.on("error", (e) => {});

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
        unchokeHandler(peer, () => {
          peer.setTimeout(() => {
            requestBlock(socket, pieces, peer);
          }, 10000);

          requestBlock(socket, pieces, peer);
        });
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
      const index = i * 8 + 7 - j;
      if (byte % 2) peer.setPiece(index);
      byte = Math.floor(byte / 2);
    }
  });

  cb();
};

const pieceHandler = ({ payload }, pieces, file, torrent, socket, peer, cb) => {
  pieces.addReceived(payload);
  updateProgressBar(pieces);
  peer.resetTimeout();
  writeBlock(file, torrent, payload, () => {
    if (pieces.isDone()) {
      bar.stop();
      console.log("Completed Download... Verfying SHA1 Hash");
      verifyHash(file, torrent);
      fs.closeSync(file);
      process.exit();
    } else {
      cb();
    }
  });
};

const calculateFileHash = (file, torrent) => {
  const numberOfPieceHashes = Math.ceil(
    torrent.info.length / torrent.info["piece length"]
  );
  const sha1string = Buffer.alloc(numberOfPieceHashes * 20);
  const bf = Buffer.alloc(torrent.info["piece length"]);

  for (i = 0; i < numberOfPieceHashes; i++) {
    const start = i * torrent.info["piece length"];
    let end = start + torrent.info["piece length"];

    if (end > torrent.info.length) {
      end = contents.length - start;
    }

    fs.readSync(file, bf, 0, end - start, start);
    const hash = crypto.createHash("sha1").update(bf).digest();
    hash.copy(sha1string, i * 20);
  }

  return sha1string;
};

// TODO: Make this work
const verifyHash = (file, torrent) => {
  const fileHash = calculateFileHash(file, torrent);
  if (!Buffer.compare(fileHash, torrent.info.pieces) === 0) {
    throw new Error("Piece hashes invalid");
  }

  console.log("SHA1 Piece Hash verified");
};

const writeBlock = (file, torrent, { index, begin, block }, cb) => {
  const offset = index * torrent.info["piece length"] + begin;
  fs.write(file, block, 0, block.length, offset, cb);
};

const requestBlock = (socket, pieces, peer) => {
  if (peer.isChoking()) return;

  const { queue } = pieces;

  for (i = 0; i < queue.length; i++) {
    let block = queue[i];
    if (peer.hasPiece(block.index)) {
      queue.shift();
      socket.write(buildRequest(block.index, block.begin, block.length));
      pieces.addRequested(block);
      setTimeout(() => {
        if (pieces.isNeeded(block)) {
          queue.push(block);
        }
      }, 2500);
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
    const file = fs.openSync(torrent.info.name, "w+");
    const peers = await tracker.getPeers(torrent);
    const pieces = new Pieces(torrent);

    bar.start(pieces.queue.length, 0);
    peers.forEach((peer) => download(peer, pieces, torrent, file));
  } catch (err) {
    console.error(err);
  }
};
