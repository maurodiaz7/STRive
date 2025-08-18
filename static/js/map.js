function filterByStateAndThreshold(dataArray, state, threshold) {
  if (!Array.isArray(dataArray)) {
    return [];
  }

  return dataArray.filter(item => {
    if (!item.locations || !Array.isArray(item.locations)) {
      return false;
    }

    return item.locations.some(
      location => location.location === state && location.count >= threshold
    );
  });
}

function clusterIdsFromTimeline(dataArray) {
  if (!Array.isArray(dataArray)) {
    return [];
  }

  const uniqueIds = new Set();

  dataArray.forEach(item => {
    if (item && item.id) {
      uniqueIds.add(item.id);
    }
  });

  return Array.from(uniqueIds);
}

const STATE_COUNT_THRESHOLD = 45;

const cleanPreviousSelection = () => {
  if (selectedClusters.length > 0) {
    selectedClusters.forEach((clusterId) => {
      const clusterBox = document.getElementById(`box_${clusterId}`);
      if (clusterBox) {
        clusterBox.classList.remove('box_clicked');
        clusterBox.setAttribute('fill-opacity', '0');
      }
    });

    selectedClusters = [];
  }

  if (selectedClusterTimelineBoxes.length > 0) {
    selectedClusterTimelineBoxes.forEach((item) => {
      const timelineBox = document.getElementById(item);
      if (timelineBox) {
        timelineBox.setAttribute('stroke-width', '0');
      }
    });

    selectedClusterTimelineBoxes = [];
  }
};

const handleSelectState = (state) => {
  if (selectedState === state) {
    cleanPreviousSelection();
    selectedState = null;
    return;
  }

  selectedState = state;
  cleanPreviousSelection();

  const data = globalState.clusterTimeline;
  const filteredData = filterByStateAndThreshold(data, state, STATE_COUNT_THRESHOLD);

  selectedClusterTimelineBoxes = filteredData.map(item => `clusterbar_${item.id}_date_${item.date}`);

  setTimeout(() => {
    selectedClusterTimelineBoxes.forEach((item) => {
      const timelineBox = document.getElementById(item);
      if (timelineBox) {
        timelineBox.setAttribute('stroke', 'red');
        timelineBox.setAttribute('stroke-width', '1.5');
      }
    });

    const clustersFromFilteredData = clusterIdsFromTimeline(filteredData);
    selectedClusters = clustersFromFilteredData;

    selectedClusters.forEach((clusterId) => {
      const clusterBox = document.getElementById(`box_${clusterId}`);
      if (clusterBox) {
        clusterBox.classList.add('box_clicked');
        clusterBox.setAttribute('fill-opacity', '0.15');
      }
    });
  }, 20);
};

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');

  toggleSwitch.addEventListener('change', () => {
    if (toggleSwitch.checked) {
      globalState.mapMode = MapMode.PER_CAPITA;
    } else {
      globalState.mapMode = MapMode.OCCURRENCES;
    }
    drawMap();
  });
});