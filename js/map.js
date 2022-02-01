import { intersects } from "https://js.arcgis.com/4.18/@arcgis/core/geometry/geometryEngineAsync.js";
const apiKey = "AAPK24e42b66a3b54203a7a77df57d25822atOmmoxEQT_himZgqKMjLhMkagFjnZjooh9EPm6fACROkuVbnG9V3I7wGQRZRmJ4O";

const authentication = new arcgisRest.ApiKey({
    key: apiKey
});

function getBorderingZones(addressZone) {
  return new Promise(resolve => {
      allZones.forEach(async function (zone, i) {
          zone.spatialReference = {
              "wkid": 4326
          }
          const isBordering = await intersects(addressZone.geometry, zone.geometry);
          if (isBordering === true) {
            // debugger
              if (addressZone.attributes.Nombre != zone.attributes.Nombre) {
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

function getBorderingSchools(addressZone) {
  return new Promise(resolve => {
      getBorderingZones(addressZone).then(borderingZones => {
          bordering = [];
          borderingZones.forEach((zone, i) => {
              allSchools.forEach(async function (school, j) {
                  school.geometry.spatialReference = zone.geometry.spatialReference = {
                      "wkid": 4326
                  };
                  const isBordering = await intersects(school.geometry, zone.geometry);
                  if (isBordering === true) {
                      // console.log(`${zone.attributes.Nombre} si intersecta con ${school.attributes.Nombre} `)
                      bordering.push(school);
                      
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

function processForm(e) {
    if (e.preventDefault) e.preventDefault();

    if(executing === true){
      return false;
    }
    
    document.getElementById('message').innerHTML = `
      <img src="images/spinner.gif"> Buscando colegios correspondientes a ${document.getElementById("address").value}
    `;
    if(document.querySelector('.calculator').classList.contains("collapsed") === false){
      document.querySelector('.calculator').classList.add("collapsed");
    }
    if(document.querySelector('.calculator-button-div').classList.contains("visible") === true){
      document.querySelector('.calculator-button-div').classList.remove("visible");
    }
    
    executing = true;
    arcgisRest.geocode({
        address: document.getElementById("address").value,
        postal: 13700,
        city: "Tomelloso",
        countryCode: "ES",
        // searchExtent: "-3.1247949550328133,39.10051392185686,-2.901906068104559,39.22949157768225",
        authentication
    })
        .then((response) => {
            // console.log("Candidates:", response.candidates);
            if (response.candidates[0].address == 13700) {
                let elem = document.getElementById("info-center")
                elem.classList.remove('success');
                elem.classList.add('error');
                document.getElementById("message").innerText = `Lo sentimos, no hemos sido capaces de encontrar tu dirección`;
                executing = false;
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
                spatialRel: "esriSpatialRelIntersects",
                outSR: 4326
            })
                .then(response => {
                    // console.log(response.features);
                    let elem = document.getElementById("info-center")
                    elem.classList.add('success');
                    elem.classList.remove('error');
                    // document.getElementById("info-center").innerHTML = `Hemos ubicado tu calle en la ${response.features[0].attributes.Nombre}, por favor revisa en el mapa que la hemos ubicado correctamente.<br> Los centros de Infantil y Primaria que se encuentran en esta zona son: <br>${response.features[0].attributes.Puntos}`;

                    const addressZone = response.features[0];
                    addressZone.geometry.spatialReference = {
                        "wkid": 4326
                    };
                    
                    getBorderingSchools(addressZone).then(borderingSchools => {
                        const borderingSchoolsStr = borderingSchools.reduce((previousValue, currentValue) => {
                            if (previousValue.attributes) {
                                previousValue = "<br> &bull; " + previousValue.attributes.Nombre
                            }
                            return previousValue += `<br> &bull; ${currentValue.attributes.Nombre}`;
                        });
                        
                        const message = document.createElement("p");
                        message.innerHTML = `
                          <p>
                            Hemos ubicado tu calle en la ${response.features[0].attributes.Nombre}, 
                            por favor revisa en el mapa, más abajo, que la hemos ubicado correctamente.<br><br>
                            Los centros de Infantil y Primaria que se encuentran en esta zona son: 
                            <br>${response.features[0].attributes.Puntos}<br><br>
                            Y los de las zonas limítrofes son: ${borderingSchoolsStr}.
                          </p>
                        `;
                        document.getElementById('message').innerHTML = '';
                        document.querySelector("#message").prepend(message);
                        document.querySelector(".calculator-button-div").classList.add("visible")
                        executing = false;
                    });

                    // console.log("addressZone.geometry=",addressZone.geometry)
                    // Get schools in my zone
                    schools = [];
                    arcgisRest.queryFeatures({
                      url: "https://services.arcgis.com/Q6ZFRRvMTlsTTFuP/arcgis/rest/services/Colegios_Tomelloso_2/FeatureServer/0",
                      geometry: addressZone.geometry,
                      geometryType: "esriGeometryPolygon",
                      spatialRel: "esriSpatialRelIntersects",
                      where: "Clasificacion = 'Infantil y Primaria'",
                      inSR: "4326",
                      outSR: "4326",
                      maxUrlLength: 100
                    }).then(response => {
                      response.features.forEach(el => schools.push(el));
                    });

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
    url: "https://services7.arcgis.com/d9R4ThD32qsG1Wu4/ArcGIS/rest/services/ZonasEscolares/FeatureServer/0",
    outSR: 4326
  }).then(response => {
      // Fill global variable with all zones
      allZones = response.features;
      // console.log("Todas las zonas =", allZones);
  });

  arcgisRest.queryFeatures({
      url: "https://services.arcgis.com/Q6ZFRRvMTlsTTFuP/ArcGIS/rest/services/Colegios_Tomelloso_2/FeatureServer/0",
      where: "Clasificacion = 'Infantil y Primaria'",
      orderByFields: "Nombre",
      outSR: 4326
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