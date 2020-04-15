class Peer {
  constructor(port, ip) {
    this.ip = ip;
    this.port = port;
    this.amChoking = 0;
    this.amInterested = 0;
    this.peerChoking = 1;
    this.peerInterested = 0;
  }
}

module.exports = Peer;
