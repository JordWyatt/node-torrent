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

  setPiece(index) {
    this.pieces[index] = true;
  }
}

module.exports = Peer;
