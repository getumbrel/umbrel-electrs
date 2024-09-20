const express = require("express");
const router = express.Router();
const fulcrumService = require("services/fulcrum");

const systemLogic = require("logic/system.js");
const safeHandler = require("utils/safeHandler");

router.get(
  "/electrum-connection-details",
  safeHandler(async (req, res) => {
    const connectionDetails = await systemLogic.getElectrumConnectionDetails();
    return res.status(200).json(connectionDetails);
  })
);

router.get(
  "/version",
  safeHandler(async (req, res) => {
    try {
      const version = await fulcrumService.getVersion();
      return res.status(200).json(version);
    } catch (e) {
      console.error("version error: ", e);
      return res.status(500).json(e);
    }
  })
);

router.get(
  "/syncPercent",
  safeHandler(async (req, res) => {
    try {
      const syncPercent = await fulcrumService.syncPercent();

      return res.status(200).json(syncPercent);
    } catch (e) {
      console.error("syncPercent error: ", e);
      return res.status(500).json(e);
    }
  })
);

module.exports = router;
