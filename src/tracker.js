const axios = require("axios");
const parser = require("./parser");
const bencode = require("bencode");
const { percentEncode } = require("./utils");
const Peer = require("./peer");

const PEER_SIZE = 6;
const IPV4_SIZE = 4;
const PORT_SIZE = 2;

const getPeers = async (torrent) => {
  try {
    const announceUrl = torrent.announce.toString();
    const trackerRequestUrl = buildTrackerRequest(announceUrl, torrent);
    const { data: trackerResponse } = await axios.get(trackerRequestUrl, {
      responseType: "arraybuffer",
    });
    const decoded = bencode.decode(trackerResponse);
    const peers = parsePeers(decoded.peers);
    return peers;
  } catch (err) {
    console.error(err);
  }
};

const buildTrackerRequest = (url, torrent) => {
  const peerId = parser.getPeerId(torrent);
  const infoHash = parser.getInfoHash(torrent);
  const percentEncodedInfoHash = percentEncode(infoHash);
  return `${url}?info_hash=${percentEncodedInfoHash}&peer_id=${peerId}&compact=1`;
};

const parsePeers = (buffer) => {
  const peers = [];

  if (buffer.length % PEER_SIZE !== 0) {
    throw new Error("Received malformed peers");
  }

  const numPeers = buffer.length / PEER_SIZE;

  for (i = 0; i < numPeers; i++) {
    const offset = i * PEER_SIZE;
    const ip = parseIPV4Address(buffer.slice(offset, offset + 4));
    const port = parsePort(buffer.slice(offset + 4, offset + PEER_SIZE));
    const peer = new Peer(port, ip);
    peers.push(peer);
  }

  return peers;
};

const parseIPV4Address = (buffer) => {
  if (buffer.length % IPV4_SIZE !== 0) {
    throw new Error("Received malformed IP Address");
  }

  return buffer.join(".");
};

const parsePort = (buffer) => {
  if (buffer.length % PORT_SIZE !== 0) {
    throw new Error("Received malformed Port");
  }

  return buffer.readUInt16BE();
};

module.exports = {
  getPeers,
};
