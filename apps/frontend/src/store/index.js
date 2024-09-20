import Vue from "vue";
import Vuex from "vuex";

//Modules
import system from "./modules/system";
import fulcrum from "./modules/fulcrum";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    system,
    fulcrum
  }
});
