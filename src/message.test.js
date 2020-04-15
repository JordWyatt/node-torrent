const parser = require("./parser");
const {
  buildHandshake,
  buildMessage,
  parseMessage,
  parseHandshakeResponse,
} = require("./message");

const expectedPstr = "BitTorrent protocol";
const expectedReservedBytes =
  "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000";
const mockInfoHash = "iama20byteteststring";
const mockPeerId = "iama20byteteststring";
const mockPayload = "somepayload";
const mockId = 123;

parser.getPeerId = jest.fn(() => mockPeerId);
parser.getInfoHash = jest.fn(() => Buffer.from(mockInfoHash));

const makeHandshake = () => {
  const handshake = Buffer.alloc(68);
  handshake.writeUInt8(expectedPstr.length, 0);
  handshake.write(expectedPstr, 1);
  handshake.writeUInt32BE(0, 20);
  handshake.writeUInt32BE(0, 24);
  handshake.write(mockInfoHash, 28);
  handshake.write(mockPeerId, 48);
  return handshake;
};

const makeMessage = () => {
  const payload = Buffer.from(mockPayload);
  const length = payload.length + 1; // + 1 for ID
  const buf = Buffer.alloc(4 + length); // 4 for 32 bit int used for length

  buf.writeUInt32BE(length, 0);
  buf.writeUInt8(mockId, 4);

  if (payload.length) {
    buf.set(payload, 5);
  }

  return buf;
};

describe("build message", () => {
  it("should return an empty buffer of length 4 if message id is null (keep-alive)", () => {
    const message = buildMessage();
    expect(message.length).toEqual(4);
  });

  it("should return a buffer of length 5 (4 byte length, 1 byte id) if no payload is passed", () => {
    const message = buildMessage(1);
    expect(message.length).toEqual(5);
  });

  it("should return a buffer of length 5+N for a payload of N bytes", () => {
    const payload = Buffer.alloc(123);
    const message = buildMessage(1, payload);
    expect(message.length).toEqual(128);
  });

  describe("should return buffer with correct contents", () => {
    const expectedId = 16;
    const expectedPayload = 128;
    const payloadSize = 8;

    const payload = Buffer.alloc(8);
    payload.writeUInt8(expectedPayload);

    const message = buildMessage(expectedId, payload);

    it("should have bytes 0-3 set to N+1 where N is number of bytes of payload", () => {
      expect(message.readUInt32BE(0)).toEqual(payloadSize + 1);
    });

    it("should have byte 4 length set to ID of the message", () => {
      expect(message.readUInt8(4)).toEqual(expectedId);
    });

    it("should have bytes 5 to N-1, where N is the length of the payload, set to the payload contents", () => {
      expect(message.readUInt8(5)).toEqual(expectedPayload);
    });
  });
});

describe("build handshake", () => {
  it("should build a correctly formed handshake message", () => {
    const handshake = buildHandshake({});
    const ptrLength = handshake.readUInt8(0);
    const ptr = handshake.toString("utf8", 1, 20);
    const reserved = handshake.toString("utf8", 20, 28);
    const infoHash = handshake.toString("utf8", 28, 48);
    const peerId = handshake.toString("utf8", 48, 68);

    expect(handshake.length).toEqual(68);
    expect(ptrLength).toEqual(expectedPstr.length);
    expect(ptr).toEqual(expectedPstr);
    expect(reserved).toEqual(expectedReservedBytes);
    expect(infoHash).toEqual(mockInfoHash);
    expect(peerId).toEqual(mockPeerId);
  });
});

describe("parse handshake", () => {
  const handshake = makeHandshake();

  it("should throw error if handshake is malformed", () => {
    let err;
    const malformedHandshake = handshake.slice(0, 10);

    try {
      parseHandshakeResponse(malformedHandshake);
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
    expect(err.message).toEqual("Handshake response malformed");
  });

  it("should parse handshake responses into an appropriate object", () => {
    const parsedHandshake = parseHandshakeResponse(handshake);
    const { ptrLength, ptr, reserved, infoHash, peerId } = parsedHandshake;
    expect(ptrLength).toEqual(expectedPstr.length);
    expect(ptr).toEqual(expectedPstr);
    expect(reserved).toEqual(expectedReservedBytes);
    expect(infoHash).toEqual(mockInfoHash);
    expect(peerId).toEqual(mockPeerId);
  });
});

describe("parse message", () => {
  const message = makeMessage();
  const { length, id, payload } = parseMessage(message);
  expect(length).toEqual(mockPayload.length + 1);
  expect(id).toEqual(mockId);
  expect(payload).toEqual(Buffer.from(mockPayload));
});
