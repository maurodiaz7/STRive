function createCheckboxes(items, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    items.forEach(attr => {
        const label = document.createElement("label");
        label.className = "fieldset-label text-xs text-neutral";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "checkbox checkbox-primary checkbox-xs";
        checkbox.value = attr;
        checkbox.name = "column-cb";

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + attr));

        container.appendChild(label);
    });
}

function createDatePickers(first_date, last_date, pickerId1, pickerId2){
    // set default values
    document.getElementById(pickerId1).value = first_date;
    document.getElementById(pickerId2).value = last_date;
    
    var [year, month] = first_date.split("-").map(Number);
    first_date = new Date(year, month - 1, 1);

    [year, month] = last_date.split("-").map(Number);
    last_date = new Date(year, month, 0);

    new Pikaday({
        field: document.getElementById(pickerId1),
        defaultDate: first_date,
        minDate: first_date,
        maxDate: last_date,
        toString(date) {
            const month = ("" + (date.getMonth() + 1)).padStart(2, "0");
            const year = date.getFullYear();
            return `${year}-${month}`;
      },
    });

    new Pikaday({
        field: document.getElementById(pickerId2),
        defaultDate: last_date,
        minDate: first_date,
        maxDate: last_date,
        toString(date) {
            const month = ("" + (date.getMonth() + 1)).padStart(2, "0");
            const year = date.getFullYear();
            return `${year}-${month}`;
        },
    });
    
}


function readGeoJSONFile(jsonFile) {
    return new Promise((resolve, reject) => {
        if (!jsonFile) {
            reject(new Error("No file provided"));
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const geojsonData = JSON.parse(e.target.result);
                resolve(geojsonData);
            } catch (err) {
                reject(new Error("Invalid JSON: " + err.message));
            }
        };

        reader.onerror = function () {
            reject(new Error("Error reading file"));
        };

        reader.readAsText(jsonFile);
    });
}

