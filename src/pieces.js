const BYTES_PER_SHA1_HASH = 20;

class Pieces {
  constructor(torrent) {
    function makePiecesArray() {
      const pieceHashes = torrent.info.pieces;
      const numPieces = pieceHashes.length / BYTES_PER_SHA1_HASH;
      const arr = new Array(numPieces).fill(null);
      return arr;
    }
    this.requested = makePiecesArray();
    this.received = makePiecesArray();
  }
}
