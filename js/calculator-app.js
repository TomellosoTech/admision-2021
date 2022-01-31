function calculatePoints(event) {  
    const inputs = [
        'tipo_domicilio',
        'discapacidad',
        'fam_numerosa',
        'fam_monoparental',
        'parto_multiple',
        'acogimiento',
        'vic_genero'
    ];
    let inputValues = {};
    
    inputs.forEach(elem => {
        inputValues[elem] = document.querySelector(`[name="${elem}"]`);
    });

    if(document.querySelector(`[name="escolarizados"]`).value === "si"){
        inputValues["escolarizados"] = document.querySelectorAll(`[name^="centro_familiar_"]`);
    }

    const pointsPerSchool = calculatePointsPerSchool(inputValues);
    const sortedSchools = sortDict(pointsPerSchool);

    const tbodyEl = document.querySelector('.results-table tbody');
    tbodyEl.innerHTML = '';
    sortedSchools.forEach(el => {
        const trEl = document.createElement("tr");
        const obj = allSchools.find(school => slugify(school.attributes.Nombre) === el);
        let note = "";
        if (obj.attributes.OBJECTID === 3){
            note = "<sup>1</sup>";
        }
        trEl.innerHTML = `
            <td>${obj.attributes.Nombre}${note}</td>
            <td>${pointsPerSchool[el]}</td>
        `;
        tbodyEl.appendChild(trEl);
    })
    
    // console.log(`Values: `, inputValues);
    event.preventDefault();
}

function removeSchool(distantSchools, objectId){
    const filtered = distantSchools.filter(function( obj ) {
        return obj.attributes.OBJECTID !== objectId;
    });
    return filtered;
}

function sortDict( dict ) {
    // Step - 1
    // Create the array of key-value pairs
    var items = Object.keys(dict).map(
        (key) => { return [key, dict[key]] });
    
    // Step - 2
    // Sort the array based on the second element (i.e. the value)
    items.sort(
        (first, second) => { return second[1] - first[1] }
    );
    
    // Step - 3
    // Obtain the list of keys in sorted order of the values.
    var keys = items.map(
        (e) => { return e[0] });
    
    return keys;
}


function calculatePointsPerSchool(inputValues){
    const pointsPerSchool = {};
    
    let pointsPer ={
        singleParent: inputValues["fam_monoparental"].value === "si"? 2: 0,
        multipleBirth: inputValues["parto_multiple"].value === "si"? 2: 0,
        fosterCare: inputValues["acogimiento"].value === "si"? 2: 0,
        genderVictim: inputValues["vic_genero"].value === "si"? 2: 0
    };
    
    switch(inputValues["discapacidad"].value){
        case "no":
            pointsPer["disability"] = 0;
            break;
        case "alumno":
            pointsPer["disability"] = 3;
            break;
        case "padres":
            pointsPer["disability"] = 2;
            break;
        case "hermano":
            pointsPer["disability"] = 1;
            break;
    }

    switch(inputValues["fam_numerosa"].value){
        case "no":
            pointsPer["largeFamily"] = 0;
            break;
        case "especial":
            pointsPer["largeFamily"] = 2;
            break;
        case "general":
            pointsPer["largeFamily"] = 1;
            break;
    }
    
    let defaultPoints = 0;
    for (const [key, value] of Object.entries(pointsPer)) {
        // console.log(key, value);
        //location: inputValues["tipo_domicilio"].value === "familiar"? 10: 8,
        defaultPoints += value;
    }
    
    allSchools.forEach(elem => {
        const centerName = slugify(elem.attributes.Nombre);
        pointsPerSchool[centerName] = defaultPoints;
    });

    let distantSchools = JSON.parse(JSON.stringify(allSchools))
    // Increase points to schools in zone or intered location
    schools.forEach(elem => {
        let points = 8;
        if(elem.attributes.OBJECTID === 3 || inputValues["tipo_domicilio"].value === "familiar"){
            // If Milagrosa or familiar +10 points
            points = 10;
        }
        distantSchools = removeSchool(distantSchools, elem.attributes.OBJECTID);
        pointsPerSchool[slugify(elem.attributes.Nombre)] += points;
    });
    

    // Increase points to schools in zone or intered location
    bordering.forEach(elem => {
        let points = 5;
        if(elem.attributes.OBJECTID === 3){
            // If Milagrosa or familiar +10 points
            points = 10;
        }
        distantSchools = removeSchool(distantSchools, elem.attributes.OBJECTID);
        pointsPerSchool[slugify(elem.attributes.Nombre)] += points;
    });

    // Increase points to other schools (+3)
    distantSchools.forEach(elem => {
        let points = 3;
        if(elem.attributes.OBJECTID === 3){
            points = 10;
        }
        pointsPerSchool[slugify(elem.attributes.Nombre)] += 3;
    });

    // Increase points to schools with brothers or parents
    if(inputValues["escolarizados"]){
        inputValues["escolarizados"].forEach(elem => {
            switch(elem.value){
                case "hermanos": 
                case "ambos": 
                    pointsPerSchool[elem.dataset.slug] += 10;
                    break;
                case "padres": 
                    pointsPerSchool[elem.dataset.slug] += 8;
            }
        });
    }

    return pointsPerSchool;
}

function toggleAddSchoolBtn(){
    const centrosField = document.querySelector('[name="centros"]'),
          addSchoolBtn = document.getElementById("add-school")
    if(centrosField.disabled === false){
        centrosField.setAttribute("disabled", true);
        addSchoolBtn.setAttribute("disabled", true);
    }else{
        centrosField.removeAttribute("disabled");
        addSchoolBtn.removeAttribute("disabled")
    }

}
function addSchoolField(event) {
    const centrosField = document.querySelector('[name="centros"]')
    
    // Disable option an select next one
    const centrosOption = centrosField.options[centrosField.selectedIndex];
    centrosOption.setAttribute("disabled", true);
    const start = centrosField.selectedIndex;
    let optionDisabled = true;
    do{
        centrosField.selectedIndex = (centrosField.selectedIndex + 1) % centrosField.options.length;
        if(centrosField.options[centrosField.selectedIndex].disabled != true){
            optionDisabled = false;
        }
        if(centrosField.selectedIndex === start){
            optionDisabled = false;
            // console.log("Deshabilitar boton");
            toggleAddSchoolBtn();            
        }
    }while(optionDisabled);

    // Add HTML template
    var newSchool = oneLineTag("div", {
        class: "calculator-group__item",
        id: `family_related_center_${start}`
    });
    newSchool.innerHTML = `
        <p class="calculator-group__label">
            En el ${centrosOption.innerText} tiene 
        </p>
        <select 
            class="calculator-group__option" 
            name="centro_familiar_${start}"
            data-slug="${slugify(centrosOption.innerText)}"
            data-schoolName="${centrosOption.innerText}"
        >
            <option value="null">-</option>
            <option value="hermanos">Hermanos matriculados</option>
            <option value="padres">Padre(s) trabajando</option>
            <option value="ambos">Ambos</option>
        </select>
        <button data-schoolIndex="${start}">
            Borrar
        </button>
    `;

    document.querySelector('.calculator-group__set').appendChild(newSchool);

    const newBtnEl = document.querySelector(`#family_related_center_${start} button`);
    newBtnEl.addEventListener('click', removeSchoolField);  
    
    // console.log(htmlTemplate)
    event.preventDefault();
}

function removeSchoolField(event){
    // Remove school and restore option
    const notDisabled = document.querySelectorAll('[name="centros"] option:not([disabled=true])');
    if(notDisabled.length === 0){
        toggleAddSchoolBtn()
    }
    const index = parseInt(event.target.dataset.schoolindex);
    const centrosField = document.querySelector('[name="centros"]')
    centrosField.options[index].removeAttribute("disabled")
    document.getElementById(`family_related_center_${index}`).remove();
    event.preventDefault();
}

function oneLineTag(tag,options){
    return Object.assign(document.createElement(tag),options);
}

function waitForSchools(){
    if(allSchools && allSchools.length !== 0){
        const centrosField = document.querySelector('[name="centros"]');
        allSchools.forEach(elem => {
            const opt = oneLineTag("option", {
                innerText: elem.attributes.Nombre,
                value: slugify(elem.attributes.Nombre)
            });
            centrosField.appendChild(opt)
            
        });
    }
    else{
        setTimeout(waitForSchools, 250);
    }
}

// Slugify a string
function slugify(str)
{
    str = str.replace(/^\s+|\s+$/g, '');

    // Make the string lowercase
    str = str.toLowerCase();

    // Remove accents, swap ñ for n, etc
    var from = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆÍÌÎÏŇÑÓÖÒÔÕØŘŔŠŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇíìîïňñóöòôõøðřŕšťúůüùûýÿžþÞĐđßÆa·/_,:;";
    var to   = "AAAAAACCCDEEEEEEEEIIIINNOOOOOORRSTUUUUUYYZaaaaaacccdeeeeeeeeiiiinnooooooorrstuuuuuyyzbBDdBAa------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    // Remove invalid chars
    str = str.replace(/[^a-z0-9 -]/g, '') 
    // Collapse whitespace and replace by -
    .replace(/\s+/g, '-') 
    // Collapse dashes
    .replace(/-+/g, '-'); 

    return str;
}

function Main() {
    console.log('estamos en Main ');
    // Aqui ponemos el flujo normal que lleva la aplicacion. 
    
    const calculatorForm = document.getElementById('calculator-form');
    //   const log = document.getElementById('log');
    calculatorForm.addEventListener('submit', calculatePoints);  

    
    // We wait until schools are ready
    waitForSchools();
    
    // Add dynamic behaviour to add family related schools
    const addCenter = document.getElementById('add-school');
    addCenter.addEventListener('click', addSchoolField);  

    
    var select = document.querySelector('#linked-to-school');
    select.addEventListener('change',function(evt){
        const divEl = document.querySelector('.calculator-group');
        
        if (divEl.style.display === "none") {
            divEl.style.display = "block";
        } else {
            divEl.style.display = "none";
        }
    });

}

Main();