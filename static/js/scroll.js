const clusterView = document.getElementById("cluster-view");
const clusterHeatmap = document.getElementById("cluster-heatmap");

let isScrolling = false;

clusterView.addEventListener("scroll", function () {
  if (!isScrolling) {
    isScrolling = true;

    clusterHeatmap.scrollTop = this.scrollTop;
    //clusterHeatmap.scrollLeft = this.scrollLeft;

    setTimeout(() => {
      isScrolling = false;
    }, 10);
  }
});

clusterHeatmap.addEventListener("scroll", function () {
  if (!isScrolling) {
    isScrolling = true;

    clusterView.scrollTop = this.scrollTop;
    //clusterView.scrollLeft = this.scrollLeft;

    setTimeout(() => {
      isScrolling = false;
    }, 10);
  }
});



const rulesView = document.getElementById("cluster-view-rules");
const rulesHeatmap = document.getElementById("cluster-heatmap-rules");

let isScrollingRules = false;


rulesView.addEventListener("scroll", function () {
  if (!isScrolling) {
    isScrolling = true;

    rulesHeatmap.scrollTop = this.scrollTop;
    //rulesHeatmap.scrollLeft = this.scrollLeft;

    setTimeout(() => {
      isScrolling = false;
    }, 10);
  }
});

rulesHeatmap.addEventListener("scroll", function () {
  if (!isScrolling) {
    isScrolling = true;

    rulesView.scrollTop = this.scrollTop;
    //clusterView.scrollLeft = this.scrollLeft;

    setTimeout(() => {
      isScrolling = false;
    }, 10);
  }
});
