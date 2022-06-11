import Vue from "vue";
import Vuex from "vuex";

//Modules
import system from "./modules/system";
import electrs from "./modules/electrs";

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    system,
    electrs
  }
});
