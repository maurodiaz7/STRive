const ViewMode = Object.freeze({
  CLUSTER: "cluster",
  RULES: "rules",
});

const MapMode = Object.freeze({
  OCCURRENCES: "occurrences",
  PER_CAPITA: "per_capita",
});

const globalState = {
  selectedCluster: null,
  viewMode: ViewMode.CLUSTER,
  clusterTimeline: null,
  mapMode: MapMode.OCCURRENCES,
  scatterplotData: [],
  dates: [],

  setSelectedCluster: (cluster) => {
    console.log("Setting selected cluster to:", cluster);
    this.selectedCluster = cluster;
    let positionClusterRules = -1;
    
    for (let i = 0; i < this.scatterplot_data.length; i++){
      if(this.scatterplot_data[i]?.id === cluster){
        //console.log("EL CLUSTER ES", this.scatterplot_data[i]?.id, "y su num de reglas es", this.scatterplot_data[i]?.rules);
        positionClusterRules = i;
        console.log("INDEX positionClusterRules", positionClusterRules)
      }
    }
    if (cluster !== undefined) {
      const tabRulesComponent = document.getElementById("tab-rules-component");
      tabRulesComponent.classList.remove("tab-disabled");
    }
    if (this.scatterplot_data[positionClusterRules]?.rules === 1) {
      const tabRulesComponent = document.getElementById("tab-rules-component");
      tabRulesComponent.classList.add("tab-disabled");
    }
  },  
  setViewMode: (mode) => {
    this.viewMode = mode;
    if (mode === ViewMode.RULES && this.selectedCluster !== undefined) {
      handleChangeToClusterView(this.selectedCluster);
      showRulesView();
    }
    if (mode === ViewMode.CLUSTER) {
      showClusterView();
    }
  },
  setScatterplotData: function (data) {
    this.scatterplotData = data;
    console.log("scatterplotData updated:", this.scatterplotData);
  },
  setDates(dates){
    this.dates = dates;
  }
};

const showClusterView = () => {
  document.getElementById("content").classList.remove("hidden");
  document.getElementById("rules-content").classList.add("hidden");
};

const showRulesView = () => {
  document.getElementById("content").classList.add("hidden");
  document.getElementById("rules-content").classList.remove("hidden");
};


document.addEventListener("DOMContentLoaded", () => {
  const tabClusters = document.getElementById("tab-clusters");
  const tabRules = document.getElementById("tab-rules");

  if (!tabClusters || !tabRules) {
    console.error(
      "No se encontraron los elementos con ID tab-clusters y/o tab-rules"
    );
    return;
  }

  tabClusters.onchange = () => {
    globalState.setViewMode(ViewMode.CLUSTER);
  };

  tabRules.onchange = () => {
    globalState.setViewMode(ViewMode.RULES);
  };
});
