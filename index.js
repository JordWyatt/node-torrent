const parser = require("./src/parser");
const tracker = require("./src/tracker");
const inPath = process.argv[2];

async function download() {
  try {
    const torrent = parser.open(inPath);
    const peers = await tracker.getPeers(torrent);
    console.log(peers);
  } catch (err) {
    console.error(err);
  }
}

download();
