const BYTES_PER_SHA1_HASH = 20;

const { getBlocksPerPiece } = require("./torrent-parser");
class Pieces {
  constructor(torrent) {
    this.queue = this.makeQueue(torrent);
    this.requested = this.makePiecesArray(torrent);
    this.received = this.makePiecesArray(torrent);
  }

  // May end up using this
  // makeBlocksArray(torrent) {
  //   const pieceHashes = torrent.info.pieces;
  //   const numPieces = pieceHashes.length / BYTES_PER_SHA1_HASH;
  //   const pieces = new Array(numPieces).fill(null);
  //   const blocks = pieces.map(
  //     (_, i) => new Array(getBlocksPerPiece(torrent, i).fill(null))
  //   );
  //   return blocks;
  // }

  makePiecesArray(torrent) {
    const pieceHashes = torrent.info.pieces;
    const numPieces = pieceHashes.length / BYTES_PER_SHA1_HASH;
    const arr = new Array(numPieces).fill(null);
    return arr;
  }

  makeQueue(torrent) {
    const queue = [];
    const pieceHashes = torrent.info.pieces;
    const numPieces = pieceHashes.length / BYTES_PER_SHA1_HASH;
    for (i = 0; i < numPieces; i++) {
      const startIndex = BYTES_PER_SHA1_HASH * i;
      const endIndex = startIndex + 20;
      const piece = {
        index: i,
        hash: pieceHashes.slice(startIndex, endIndex),
        length: parser.getPieceLength(torrent, i),
      };
      queue.push(piece);
    }
    return queue;
  }
}

module.exports = Pieces;
