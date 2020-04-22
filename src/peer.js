class Peer {
  constructor(port, ip, numPieces) {
    this.ip = ip;
    this.port = port;
    this.choking = true;
    this.pieces = new Array(numPieces).fill(false);
    this.working = false;
  }

  unchoke() {
    this.choking = false;
  }

  choke() {
    this.choking = true;
  }

  isWorking() {
    return this.working;
  }

  isChoking() {
    return this.choking;
  }

  setPiece(index) {
    this.pieces[index] = true;
  }

  hasPiece(index) {
    return this.pieces[index];
  }
}

module.exports = Peer;
