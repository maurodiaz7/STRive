function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
function setQueryParam(param, value) {
  const url = new URL(window.location);
  url.searchParams.set(param, value);
  window.history.pushState({}, '', url);
}

function setDrawerState(open) {
  const drawerToggle = document.getElementById('my-drawer');
  if (drawerToggle) drawerToggle.checked = open;
}

function updateDrawerFromQuery() {
  const drawerParam = getQueryParam('drawer');
  if (drawerParam === 'closed') {
    setDrawerState(false);
  } else {
    setDrawerState(true);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updateDrawerFromQuery();
  const datasetParam = getQueryParam('dataset');
  if (datasetParam) {
    const radioButton = document.querySelector(`input[name="dataset"][value="${datasetParam}"]`);
    if (radioButton) radioButton.checked = true;
  }
  const selectDatasetButton = document.getElementById('select-dataset-main');
  if (selectDatasetButton) {
    selectDatasetButton.addEventListener('click', function() {
      const selectedDataset = document.querySelector('input[name="dataset"]:checked');
      if (selectedDataset) {
        const url = new URL(window.location);
        url.searchParams.set('dataset', selectedDataset.value);
        url.searchParams.set('drawer', 'closed');
        window.location.href = url.toString();
      }
    });
  }
});
