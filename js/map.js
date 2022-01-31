import { intersects } from "https://js.arcgis.com/4.18/@arcgis/core/geometry/geometryEngineAsync.js";
const apiKey = "AAPK24e42b66a3b54203a7a77df57d25822atOmmoxEQT_himZgqKMjLhMkagFjnZjooh9EPm6fACROkuVbnG9V3I7wGQRZRmJ4O";

const authentication = new arcgisRest.ApiKey({
    key: apiKey
});

function processForm(e) {
    if (e.preventDefault) e.preventDefault();

    arcgisRest.geocode({
        address: document.getElementById("address").value,
        postal: 13700,
        city: "Tomelloso",
        countryCode: "ES",
        // searchExtent: "-3.1247949550328133,39.10051392185686,-2.901906068104559,39.22949157768225",
        authentication
    })
        .then((response) => {
            console.log("Candidates:", response.candidates);
            if (response.candidates[0].address == 13700) {
                elem = document.getElementById("info-center")
                elem.classList.remove('success');
                elem.classList.add('error');
                document.getElementById("info-center").innerHTML = "Lo sentimos, no hemos sido capaces de encontrar tu dirección"
                return -1;
            }
            // Reload map
            var data = {
                'webmap': '1db22a3fd99b4f9dab2c9432cf0f1d2d',
                'zoom': true,
                'scale': true,
                'basemap_toggle': true,
                'alt_basemap': 'hybrid',
                'disable_scroll': true,
                'theme': 'light',
            };

            var string_ = JSON.stringify(data);

            string_ = string_.replace(/{/g, "");
            string_ = string_.replace(/}/g, "");
            string_ = string_.replace(/:/g, "=")
            string_ = string_.replace(/,/g, "&");
            string_ = string_.replace(/"/g, "");

            const markerData = {
                description: 'Asegúrate de que el mapa haya ubicado correctamente tu dirección',
                url: 'https://tomellosotech.maps.arcgis.com/sharing/rest/content/items/587ee7c1f9fd41d297d8955e21bf113e/data',
                title: response.candidates[0].address
            }
            let marker = '' +
                `${response.candidates[0].location.x};` +
                `${response.candidates[0].location.y};` +
                `${response.candidates[0].location.spatialReference.wkid};` +
                `${encodeURIComponent(markerData.description)};` +
                `${encodeURIComponent(markerData.url)};` +
                `${encodeURIComponent(markerData.title)}`;

            // string_+= `&center=${response.candidates[0].location.x},${response.candidates[0].location.y}`;
            string_ += '&extent=' +
                `${response.candidates[0].extent.xmin};` +
                `${response.candidates[0].extent.ymin};` +
                `${response.candidates[0].extent.xmax};` +
                `${response.candidates[0].extent.ymax}`;
            string_ += '&marker=' + marker;

            document.getElementById("dashboard").src = `//tomellosotech.maps.arcgis.com/apps/Embed/index.html?${string_}`

            bordering = [];
            arcgisRest.queryFeatures({
                url: "https://services7.arcgis.com/d9R4ThD32qsG1Wu4/ArcGIS/rest/services/ZonasEscolares/FeatureServer/0",
                geometry: response.candidates[0].location,
                geometryType: "esriGeometryPoint",
                spatialRel: "esriSpatialRelIntersects"
            })
                .then(response => {
                    console.log(response.features);
                    let elem = document.getElementById("info-center")
                    elem.classList.add('success');
                    elem.classList.remove('error');
                    // document.getElementById("info-center").innerHTML = `Hemos ubicado tu calle en la ${response.features[0].attributes.Nombre}, por favor revisa en el mapa que la hemos ubicado correctamente.<br> Los centros de Infantil y Primaria que se encuentran en esta zona son: <br>${response.features[0].attributes.Puntos}`;

                    const addressZone = response.features[0];
                    addressZone.geometry.spatialReference = {
                        "wkid": 25830
                    };

                    function getBorderingZones() {
                        return new Promise(resolve => {
                            allZones.forEach(async function (zone, i) {
                                zone.spatialReference = {
                                    "wkid": 25830
                                }
                                const isBordering = await intersects(addressZone.geometry, zone.geometry);
                                if (isBordering === true) {
                                    if (response.features[0].attributes.Nombre != zone.attributes.Nombre) {
                                        bordering.push(zone)
                                    }
                                }
                                if (i === allZones.length - 1) {
                                    // console.log("Terminamos y devolvemos promesa getBorderingZones()")
                                    resolve(bordering);
                                }
                            });
                        });
                    }

                    function getBorderingSchools() {
                        return new Promise(resolve => {
                            getBorderingZones().then(borderingZones => {
                                bordering = [];
                                borderingZones.forEach((zone, i) => {
                                    allSchools.forEach(async function (school, j) {
                                        school.geometry.spatialReference = zone.geometry.spatialReference = {
                                            "wkid": 25830
                                        };
                                        const isBordering = await intersects(school.geometry, zone.geometry);
                                        if (isBordering === true) {
                                            // console.log(`${zone.attributes.Nombre} si intersecta con ${school.attributes.Nombre} `)
                                            bordering.push(school)
                                        } else {
                                            // console.log(`${zone.attributes.Nombre} no intersecta con ${school.attributes.Nombre} `)
                                        }

                                        if (i === borderingZones.length - 1 && j === allSchools.length - 1) {
                                            resolve(bordering);
                                        }
                                    });
                                });
                            });

                        });
                    }

                    getBorderingSchools().then(borderingSchools => {
                        const borderingSchoolsStr = borderingSchools.reduce((previousValue, currentValue) => {
                            if (previousValue.attributes) {
                                previousValue = "<br> &bull; " + previousValue.attributes.Nombre
                            }
                            return previousValue += `<br> &bull; ${currentValue.attributes.Nombre}`;
                        });
                        document.getElementById("info-center").innerHTML = `Hemos ubicado tu calle en la ${response.features[0].attributes.Nombre}, por favor revisa en el mapa que la hemos ubicado correctamente.<br><br>Los centros de Infantil y Primaria que se encuentran en esta zona son: <br>${response.features[0].attributes.Puntos}<br><br>Y los de las zonas limítrofes son: ${borderingSchoolsStr}.`;
                    })

                });
        });

    /*

    const centers = ['San Isidro', 'Moral']
    const getLocationPoint = function ....(){
        const localizacion = {
            centers[0]: 10,
            centers[1]: 8,
            centers[2]: 0
        };
        return localizacion;
    }

    if (discapacidad.value == "padre") {
        discapacidad = 3
    }

    total = {}
    while () {
        total.center[i] = localizacion[] + discapacidad //+ ...;
    }
    */


    return false;
}

function MainMap() {

  arcgisRest.queryFeatures({
    url: "https://services7.arcgis.com/d9R4ThD32qsG1Wu4/ArcGIS/rest/services/ZonasEscolares/FeatureServer/0"
  }).then(response => {
      // Fill global variable with all zones
      allZones = response.features;
      // console.log("Todas las zonas =", allZones);
  });

  arcgisRest.queryFeatures({
      url: "https://services.arcgis.com/Q6ZFRRvMTlsTTFuP/ArcGIS/rest/services/Colegios_Tomelloso_2/FeatureServer/0",
      where: "Clasificacion = 'Infantil y Primaria'",
      orderByFields: "Nombre",
      outSR: 25830
  }).then(response => {
      // Fill global variable with all schools
      allSchools = response.features;
      // console.log("Todos los coles =", allSchools);
  });

  var form = document.getElementById('query-form');
  if(form){
    if (form.attachEvent) {
        form.attachEvent("submit", processForm);
    } else {
        form.addEventListener("submit", processForm);
    }
  }
}

MainMap();