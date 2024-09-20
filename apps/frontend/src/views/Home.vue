<template>
  <div class="py-14">

    <!-- Header -->
    <div class="flex justify-content-start align-items-center">
      <div
        class="mr-6 flex items-center justify-center"
      >
        <img class="rounded-3xl w-32 h-32" src="@/assets/icon.svg" />
      </div>
      <div>
        <div class="flex items-center">
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="4" cy="4" r="4" fill="#00CD98" />
          </svg>
          <p class="ml-1 text-green-500 text-lg">Running</p>
        </div>
        <h3 class="text-5xl font-semibold  dark:text-white">Fulcrum</h3>
        <div class="mt-2">
          <span class="text-gray-500 font-medium">{{
            version ? `${version}` : "..."
          }}</span>
        </div>
      </div>
    </div>

    <div class="flex justify-end mb-2">
      <h3 class="font-semibold mb-0 text-gray-800 dark:text-gray-200">
        <span v-if="syncPercent > 0">
          <span> {{ syncPercent >= 99.99 ? 100 : Number(syncPercent).toFixed(0) }}%</span>
          <span class="align-self-end ml-1">Synchronized</span>
        </span>
        <span v-else class="animate-pulse">
          Waiting for Bitcoin Node to finish syncing...
        </span>
      </h3>
    </div>
    <progress-bar
      :percentage="syncPercent"
      colorClass="bg-green-400"
      class="h-2"
    ></progress-bar>

    <connection-information />

  </div>
</template>

<script>
// import Vue from "vue";
import { mapState } from "vuex";

import ConnectionInformation from "@/components/ConnectionInformation";
import ProgressBar from "@/components/Utility/ProgressBar";

export default {
  data() {
    return {};
  },
  computed: {
    ...mapState({
      version: (state) => state.fulcrum.version,
      syncPercent: (state) => {
        return state.fulcrum.syncPercent;
      },
    }),
  },
  methods:  {
    fetchData() {
    this.$store.dispatch("fulcrum/getSyncPercent");
    }
  },
  created() {
    this.fetchData();
    this.$store.dispatch("fulcrum/getVersion");
    this.$store.dispatch("fulcrum/getConnectionInformation");
    this.dataInterval = window.setInterval(this.fetchData, 10000);
  },
  beforeDestroy() {
    window.clearInterval(this.dataInterval);
  },
  components: {
    ConnectionInformation,
    ProgressBar,
  },
};
</script>
