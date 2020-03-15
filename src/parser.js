const fs = require("fs");
const bencode = require("bencode");
const crypto = require("crypto");

const open = path => {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    return bencode.decode(buffer);
  } else {
    console.log(`${path} is not a valid path to a file`);
  }
};

const getInfoHash = torrent =>
  crypto
    .createHash("sha1")
    .update(bencode.encode(torrent.info))
    .digest();

const getPeerId = () => "-qB4210-PH.d7a-hn83h";

const getLength = torrent => torrent.info.length;

module.exports = {
  open,
  getInfoHash,
  getPeerId,
  getLength
};
