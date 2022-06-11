const ElectrumClient = require("@lily-technologies/electrum-client");
const bitcoindService = require("services/bitcoind");

const ELECTRS_HOST = process.env.ELECTRS_HOST || "0.0.0.0";
const rpcClient = new ElectrumClient(50001, ELECTRS_HOST, "tcp");

async function getVersion() {
  const initClient = await rpcClient.initElectrum({
    client: "umbrel",
    version: "1.4"
  });

  // versionInfo[0] comes in as electrs/0.9.4, so we parse
  const version = initClient.versionInfo[0].substring(
    initClient.versionInfo[0].indexOf("/") + 1
  );
  return version;
}

// This is a little hacky way of determining if electrs is sync'd to bitcoind
// see https://github.com/romanz/electrs/pull/543#issuecomment-973078262
async function syncPercent() {
  // first, check if bitcoind isn't still IBD
  const {
    result: bitcoindResponse
  } = await bitcoindService.getBlockChainInfo();
  if (bitcoindResponse.initialblockdownload) {
    return 0;
  }

  // if not IBD, then check bitcoind height to electrs height
  const initClient = await rpcClient.initElectrum({
    client: "umbrel",
    version: "1.4"
  });

  const {
    height: electrsHeight
  } = await initClient.blockchainHeaders_subscribe();
  return (electrsHeight / bitcoindResponse.blocks) * 100;
}

module.exports = {
  getVersion,
  syncPercent
};
