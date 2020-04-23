const cliProgress = require("cli-progress");
const BYTES_PER_SHA1_HASH = 20;

const { getBlocksPerPiece, getBlockLength, BLOCK_LENGTH } = require("./parser");
class Pieces {
  constructor(torrent) {
    this.queue = this.makeQueue(torrent);
    this.requested = this.makeBlocksArray(torrent);
    this.received = this.makeBlocksArray(torrent);
  }

  makeBlocksArray(torrent) {
    const pieceHashes = torrent.info.pieces;
    const numPieces = pieceHashes.length / BYTES_PER_SHA1_HASH;
    const pieces = new Array(numPieces).fill(null);
    const blocks = pieces.map((_, i) =>
      new Array(getBlocksPerPiece(torrent, i)).fill(null)
    );
    return blocks;
  }

  makePiecesArray(torrent) {
    const pieceHashes = torrent.info.pieces;
    const numPieces = pieceHashes.length / BYTES_PER_SHA1_HASH;
    const arr = new Array(numPieces).fill(null);
    return arr;
  }

  makeQueue(torrent) {
    const templateQueue = this.makeBlocksArray(torrent);
    const queue = [];

    templateQueue.forEach((templateBlocks, pieceIndex) => {
      templateBlocks.forEach((_, blockIndex) => {
        const block = {
          index: pieceIndex,
          begin: blockIndex * BLOCK_LENGTH,
          length: getBlockLength(torrent, pieceIndex, blockIndex),
        };

        queue.push(block);
      });
    });

    return queue;
  }

  addReceived(pieceResponsePayload) {
    const { index: pieceIndex, begin } = pieceResponsePayload;
    const blockIndex = begin / BLOCK_LENGTH;
    this.received[pieceIndex][blockIndex] = true;
  }

  addRequested(block) {
    const { index: pieceIndex, begin } = block;
    const blockIndex = begin / BLOCK_LENGTH;
    this.requested[pieceIndex][blockIndex] = true;
  }

  isNeeded(block) {
    const pieceIndex = block.index;
    const blockIndex = block.begin / BLOCK_LENGTH;
    return !this.received[pieceIndex][blockIndex];
  }

  isDone() {
    return this.received.every((blocks) => blocks.every((block) => block));
  }
}

module.exports = Pieces;
