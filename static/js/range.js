const slider = document.getElementById('rangeSlider');
const supSlider = document.getElementById('supportSlider');
const liftSlider = document.getElementById('liftSlider');
const valueDisplay = document.getElementById('sliderValue');
const supDisplay = document.getElementById('supportValue');
const liftDisplay = document.getElementById('liftValue');
const filterButton = document.getElementById('filterButton');

slider.addEventListener('input', function() {
    valueDisplay.textContent = parseFloat(this.value).toFixed(1);
});
supSlider.addEventListener('input', function() {
    supDisplay.textContent = parseFloat(this.value).toFixed(2);
});
liftSlider.addEventListener('input', function() {
    liftDisplay.textContent = parseFloat(this.value).toFixed(2);
});