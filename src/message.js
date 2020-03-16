const parser = require("./parser");
const pstr = "BitTorrent protocol"; // BitTorrent 1.0 default value
const HANDSHAKE_LENGTH = 68;

function buildHandshake(torrent) {
  const message = Buffer.alloc(68);
  message.writeUInt8(pstr.length, 0);
  message.write(pstr, 1);
  message.writeUInt32BE(0, 20);
  message.writeUInt32BE(0, 24);
  parser.getInfoHash(torrent).copy(message, 28);
  message.write(parser.getPeerId(), 48);
  return message;
}

function parseHandshakeResponse(buffer) {
  if (!isHandshake(buffer)) {
    throw new Error("Handshake response malformed");
  }

  const response = {};
  response.ptrLength = buffer.readUInt8(0);
  response.ptr = buffer.toString("utf8", 1, 20);
  response.reserved = buffer.toString("utf8", 20, 28);
  response.infoHash = buffer.toString("utf8", 28, 48);
  response.peerId = buffer.toString("utf8", 48, 68);
  return response;
}

function isHandshake(buffer) {
  return (
    buffer.length === HANDSHAKE_LENGTH &&
    buffer.toString("utf8", 1, 20) === "BitTorrent protocol"
  );
}

module.exports = { buildHandshake, parseHandshakeResponse, isHandshake };
