const fs = require("fs");
const bencode = require("bencode");
const crypto = require("crypto");

const BLOCK_LENGTH = Math.pow(2, 14);

const open = (path) => {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    return bencode.decode(buffer);
  } else {
    console.log(`${path} is not a valid path to a file`);
  }
};

const getInfoHash = (torrent) => {
  return crypto
    .createHash("sha1")
    .update(bencode.encode(torrent.info))
    .digest();
};

const getPeerId = () => "-qB4210-PH.d7a-hn83h";

const getLength = (torrent) => torrent.info.length;

const getPieceLength = (torrent, pieceIndex) => {
  const maxPieceLength = torrent.info.piece_length;
  const fileLength = torrent.info.length;

  const lastPieceLength = fileLength % maxPieceLength;

  const start = pieceIndex * maxPieceLength;
  const end = start + maxPieceLength;

  return end > lastPieceLength ? lastPieceLength : maxPieceLength;
};

const getBlocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = this.getPieceLength(torrent, pieceIndex);
  return Math.ceil(pieceLength / BLOCK_LENGTH);
};

module.exports = {
  open,
  getInfoHash,
  getPeerId,
  getLength,
  getBlocksPerPiece,
  getPieceLength,
};
