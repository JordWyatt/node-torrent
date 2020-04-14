const _ = require("lodash");
const parser = require("./parser");
const pstr = "BitTorrent protocol"; // BitTorrent 1.0 default value
const HANDSHAKE_LENGTH = 68;

const buildHandshake = (torrent) => {
  const message = Buffer.alloc(HANDSHAKE_LENGTH);
  message.writeUInt8(pstr.length, 0);
  message.write(pstr, 1);
  message.writeUInt32BE(0, 20);
  message.writeUInt32BE(0, 24);
  parser.getInfoHash(torrent).copy(message, 28);
  message.write(parser.getPeerId(), 48);
  return message;
};

const parseHandshake = (buffer) => {
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
};

const isHandshake = (buffer) => {
  return (
    buffer.length === HANDSHAKE_LENGTH &&
    buffer.toString("utf8", 1, 20) === "BitTorrent protocol"
  );
};

const buildMessage = (id, payload = []) => {
  if (!id && id !== 0) {
    return Buffer.alloc(4);
  }

  const length = payload.length + 1; // + 1 for ID
  const buf = Buffer.alloc(4 + length); // 4 for 32 bit int used for length

  buf.writeUInt32BE(length, 0);
  buf.writeUInt8(id, 4);

  if (payload.length) {
    buf.set(payload, 5);
  }

  return buf;
};

const parseMessage = (buffer) => {
  const length = buffer.readUInt32BE(0);
  if (length === 0) {
    return { length };
  }

  const id = buffer.readUInt8(4);
  let payload = buffer.slice(5);

  if (id === 6 || (id === 7) | (id === 8)) {
    payload = {
      index: payload.readUInt32BE(0),
      begin: payload.readUInt32BE(4),
    };
    payload[id === 7 ? "block" : "length"] = payload.slice(8);
  }

  return {
    length,
    id,
    payload,
  };
};

const buildKeepAlive = () => buildMessage();

const buildChoke = () => buildMessage(0);

const buildUnchoke = () => buildMessage(1);

const buildInterested = () => buildMessage(2);

const buildNotInterested = () => buildMessage(3);

const buildHave = (pieceIndex) => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(pieceIndex);
  return buildMessage(4, buf);
};

const buildBitfield = (bitfield) => buildMessage(5, bitfield);

// also can be used as buildCancel
const buildRequest = (index, begin, length) => {
  const buf = Buffer.alloc(12);
  buf.writeUInt32BE(index, 0);
  buf.writeUInt32BE(begin, 4);
  buf.writeUInt32BE(length, 8);
  return buildMessage(6, buf);
};

const buildPiece = (index, begin, block) => {
  const buf = Buffer.alloc(8 + block.length);
  buf.writeUInt32BE(index, 0);
  buf.writeUInt32BE(begin, 4);
  buf.set(block, 8);
  return buildMessage(6, buf);
};

module.exports = {
  buildHandshake,
  parseHandshake,
  isHandshake,
  buildMessage,
  parseMessage,
};
