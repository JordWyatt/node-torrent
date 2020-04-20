const BYTES_PER_SHA1_HASH = 20;

class Pieces {
  constructor(torrent) {
    this.queue = this.makeQueue(torrent);
    this.requested = this.makePiecesArray(torrent);
    this.received = this.makePiecesArray(torrent);
  }

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
      };
      queue.push(piece);
    }
    return queue;
  }
}

module.exports = Pieces;
