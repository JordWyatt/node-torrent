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

const getBlockLength = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = getPieceLength(torrent, pieceIndex);

  const lastBlockLength = pieceLength % BLOCK_LENGTH || BLOCK_LENGTH;
  const lastBlockIndex = Math.floor(pieceLength / blockIndex) - 1;

  return lastBlockIndex === blockIndex ? lastBlockLength : BLOCK_LENGTH;
};

const getPieceLength = (torrent, pieceIndex) => {
  const maxPieceLength = torrent.info["piece length"];
  const fileLength = torrent.info.length;

  const lastPieceLength = fileLength % maxPieceLength || maxPieceLength;
  const lastPieceIndex = Math.floor(fileLength / maxPieceLength) - 1;

  return lastPieceIndex === pieceIndex ? lastPieceLength : maxPieceLength;
};

const getBlocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = getPieceLength(torrent, pieceIndex);
  return Math.ceil(pieceLength / BLOCK_LENGTH);
};

module.exports = {
  open,
  getInfoHash,
  getPeerId,
  getBlocksPerPiece,
  getPieceLength,
  getBlockLength,
  BLOCK_LENGTH,
};
