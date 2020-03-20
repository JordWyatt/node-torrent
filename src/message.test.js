const { buildMessage, buildHave } = require("./message");

describe("build message", () => {
  it("should return an empty buffer of length 4 if message id equals 0", () => {
    const message = buildMessage(0);
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
