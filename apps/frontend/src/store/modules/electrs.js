import API from "@/helpers/api";

// Initial state
const state = () => ({
  version: "",
  connectionInfo: {
    address: "",
    port: "",
    connectionString: "",
  },
  // -1: Bitcoin node is still syncing
  // -2: Electrs connection failed
  // >= 0: Electrs sync percent
  syncPercent: -2,
});

// Functions to update the state directly
const mutations = {
  setVersion(state, version) {
    state.version = version;
  },

  setConnectionInfo(state, connectionInfo) {
    state.connectionInfo = connectionInfo;
  },

  setSyncPercent(state, percent) {
    state.syncPercent = percent;
  },
};

// Functions to get data from the API
const actions = {
  async getConnectionInformation({ commit }) {
    const connectionInfo = await API.get(
      `${process.env.VUE_APP_API_BASE_URL}/v1/electrs/electrum-connection-details`
    );

    if (connectionInfo) {
      commit("setConnectionInfo", connectionInfo);
    }
  },

  async getVersion({ commit }) {
    const version = await API.get(
      `${process.env.VUE_APP_API_BASE_URL}/v1/electrs/version`
    );

    if (version) {
      commit("setVersion", version);
    }
  },

  async getSyncPercent({ commit }) {
    const syncPercent = await API.get(
      `${process.env.VUE_APP_API_BASE_URL}/v1/electrs/syncPercent`
    );

    if (syncPercent) {
      commit("setSyncPercent", syncPercent);
    }
  },
};

const getters = {};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
