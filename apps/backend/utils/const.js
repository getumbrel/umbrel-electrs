/* eslint-disable id-length */
module.exports = {
  REQUEST_CORRELATION_NAMESPACE_KEY: "umbrel-fulcrum-request",
  REQUEST_CORRELATION_ID_KEY: "reqId",

  ELECTRUM_HIDDEN_SERVICE:
    process.env.ELECTRUM_HIDDEN_SERVICE || "/var/lib/tor/electrum/hostname",

  ELECTRUM_LOCAL_SERVICE: process.env.ELECTRUM_LOCAL_SERVICE || "umbrel.local",

  ELECTRUM_PORT: process.env.ELECTRUM_PORT || 50001,
};
