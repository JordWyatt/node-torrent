const _ = require("lodash");

// Taken from https://gist.github.com/nkcmr/6917870
const percentEncode = buffer => {
  let ret = "";
  // ASCII table reference - http://www.ascii-code.com/
  // Percent encoding reference - https://en.wikipedia.org/wiki/Percent-encoding

  // ASCII codes for lower case "a" to lower case "z" is 97 - 122
  const a2z = _.range(97, 123);

  // ASCII codes for upper case "A" to upper case "Z" is 65 - 90
  const AtoZ = _.range(65, 91);

  // Other unreserved symbols are [ - ] , [ _ ] , [ ~ ] and [ . ]
  const other_valid_symbols = [45, 95, 126, 46];

  // ASCII codes for 0 to 9 are 48 - 57
  const zero2nine = _.range(48, 58);

  // Combine all of those ranges into one handy-dandy array
  const all_unreserved_symbols = _.union(
    a2z,
    AtoZ,
    other_valid_symbols,
    zero2nine
  );

  // Make sure variable being passed is a buffer
  if (Buffer.isBuffer(buffer)) {
    // Lets parse across the buffer
    for (i = 0; i < buffer.length; i++) {
      // Store the bytecode
      const bytecode = buffer[i];

      // Is the bytecode NOT in unreserved (Percent encoding) space?
      if (!_.includes(all_unreserved_symbols, bytecode)) {
        // bytecode is not in unreserved space - convert to hex value and append a '%'

        // convert base-10 integer to its hexedecimal value - i.e 209 would become "d1"
        const hex_value = buffer[i].toString(16);

        const padding = bytecode < 10 ? "0" : "";
        // apply a "%" i.e. "d1" becomes "%d1"
        const url_entity = "%" + padding + hex_value;

        //append to the return string
        ret += url_entity;
      } else {
        //bytecode is in unreserved space - convert to ASCII representation

        // Store the single bytecode into a very tiny buffer
        const buff = new Buffer.from([bytecode]);

        // Convert the buffer into ASCII code
        const ascii_code = buff.toString("ascii");

        //Append the friendly character to the return string
        ret += ascii_code;
      }
    }

    return ret;
  } else {
    throw new Error("First parameter must be a buffer!");
  }
};

module.exports = {
  percentEncode
};
