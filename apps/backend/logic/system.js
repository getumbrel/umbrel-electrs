const constants = require("utils/const.js");
const NodeError = require("models/errors.js").NodeError;

async function getElectrumConnectionDetails() {
  try {
    const port = constants.ELECTRUM_PORT;

    const torAddress = constants.ELECTRUM_HIDDEN_SERVICE;
    const torConnectionString = `${torAddress}:${port}:t`;

    const localAddress = constants.ELECTRUM_LOCAL_SERVICE;
    const localConnectionString = `${localAddress}:${port}:t`;

    return {
      tor: {
        address: torAddress,
        port,
        connectionString: torConnectionString,
      },
      local: {
        address: localAddress,
        port,
        connectionString: localConnectionString,
      },
    };
  } catch (error) {
    console.log("error: ", error);
    throw new NodeError("Unable to get Electrum hidden service url");
  }
}

module.exports = {
  getElectrumConnectionDetails,
};
