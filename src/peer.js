class Peer {
  constructor(port, ip, numPieces) {
    this.initialise = () => {
      this.ip = ip;
      this.port = port;
      this.choking = true;
      this.pieces = new Array(numPieces).fill(false);
      this.handshakeComplete = false;
    };

    this.initialise();
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

  isHandshakeComplete() {
    return this.handshakeComplete;
  }

  completeHandshake() {
    this.handshakeComplete = true;
  }
}

module.exports = Peer;
