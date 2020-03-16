const net = require("net");
const parser = require("./parser");
const tracker = require("./tracker");
const {
  buildHandshake,
  parseHandshakeResponse,
  isHandshake
} = require("./message");

function download(peer, torrent) {
  const socket = net.createConnection(
    { port: peer.port, host: peer.ip },
    () => {
      console.log("Connected! Writing handshake...");
      socket.write(buildHandshake(torrent));
    }
  );
  socket.on("data", data => {
    if (isHandshake(data)) {
      const handshakeResponse = parseHandshakeResponse(data);
      console.log(handshakeResponse);
    } else {
      console.log("Non handshake response");
    }
  });

  socket.on("error", e => {
    console.log(e);
  });

  socket.on("end", () => {
    console.log("disconnected from server");
  });
}

module.exports = async path => {
  try {
    const torrent = parser.open(path);
    const peers = await tracker.getPeers(torrent);
    peers.slice(0, 1).forEach(peer => download(peer, torrent));
  } catch (err) {
    console.error(err);
  }
};
