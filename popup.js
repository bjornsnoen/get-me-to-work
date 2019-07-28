let lookupButton = document.querySelector('#lookup-button');
let homeAddressField = document.querySelector('#home-address-field');
let setHomeButton = document.querySelector('#set-home-button');
let lookupAddressField = document.querySelector('#from-address-field');
let hitContainer = document.querySelector('#hit-container');

chrome.storage.sync.get('homeAddress', (data) => {
    let address = JSON.parse(data.homeAddress || '{}');
    homeAddressField.setAttribute('value', address.adressetekst || '');
    homeAddressField.dataset.address = data.homeAddress;
});

const getGraphqlQuery = (addressA, addressB) => `{
  trip(
    from: {
    	coordinates: {
      	latitude: ${addressA.representasjonspunkt.lat}
      	longitude:${addressA.representasjonspunkt.lon}
      }
    }
    to: {
      coordinates:{
        latitude: ${addressB.representasjonspunkt.lat}
        longitude: ${addressB.representasjonspunkt.lon}
      }
    }
  )

#### Requested fields
  {
    tripPatterns {
      startTime,
      duration
      walkDistance

          legs {
          
            mode
            distance
            duration
            line {
              id
              publicCode
              authority{
                name
              }
            }
          }
    }
  }
}`;

const lookupAddress = (address, callback) => {
    let service = 'https://ws.geonorge.no/adresser/v1/sok?sok=';
    let target = service + encodeURI(address);
    fetch(target).then(data => data.json()).then(data => callback(data));
};

const setHome = (address) => {
    chrome.storage.sync.set({'homeAddress': JSON.stringify(address)});
    homeAddressField.value = address.adressetekst;
    homeAddressField.dataset.address = JSON.stringify(address);
};

const addressToHitNode = (address, itemClickCallback) => {
    let newNode = document.createElement('div');
    newNode.classList.add('address-option');
    newNode.onclick = itemClickCallback;
    newNode.innerHTML = address.adressetekst + ', ' + address.poststed;
    newNode.dataset.address = JSON.stringify(address);
    return newNode;
};

const findRouteBetweenTwoAddresses = (a, b) => {
    const qry = getGraphqlQuery(a, b);
    const service = "https://api.entur.io/journey-planner/v2/graphql";
    const options = {
        method: "post",
        headers: {
            "Content-Type": "application/json",
            "ET-Client-Name": "brbcoffee - getmehome"
        },
        body: JSON.stringify({
            query: qry
        })
    };
    fetch(service, options)
        .then(data => data.json())
        .then(data => data.data)
        .then( data => {
            debugger;
            console.log(data);
            hitContainer.innerHTML="";
            if (data.trip && data.trip.tripPatterns){
                data.trip.tripPatterns.forEach(trip => {
                    let tripHtmlNode = document.createElement("div");

                    const lengthInMinutes = trip.duration / 60;
                    let totalDurationNode = document.createElement("p");
                    totalDurationNode.innerHTML = "Total: " + lengthInMinutes.toFixed(0) + 'm';
                    totalDurationNode.classList.add('total-duration');
                    tripHtmlNode.append(totalDurationNode);

                    const tripDescriptionNode = document.createElement('p');
                    tripDescriptionNode.classList.add('trip-description');
                    trip.legs.forEach((leg) => {
                        const durationInMinutes = leg.duration/60;
                        const text = `${leg.mode} ${durationInMinutes.toFixed(0)}m`;
                        tripDescriptionNode.innerHTML += text + ', ';
                    });
                    tripDescriptionNode.innerHTML = tripDescriptionNode.innerHTML.replace(/,\s*$/, "");
                    tripHtmlNode.append(tripDescriptionNode);

                    hitContainer.append(tripHtmlNode);
                });
            } else {
                hitContainer.innerHTML = "No trips!";
            }
            console.log(data);
        });
};

lookupButton.onclick = () => {
    lookupAddress(lookupAddressField.value, function (data) {
        hitContainer.innerHTML = "";
        if (data.adresser && data.adresser.length > 1){
            data.adresser.forEach(function(address) {
                let newNode = addressToHitNode(address, (evt) => {
                    let addressFrom = JSON.parse(evt.target.dataset.address);
                    let addressTo = JSON.parse(homeAddressField.dataset.address);
                    findRouteBetweenTwoAddresses(addressFrom, addressTo);
                });
                hitContainer.append(newNode);
            });
        } else if (data.adresser && data.adresser.length === 1){
            let addressFrom = data.adresser.pop();
            let addressTo = JSON.parse(homeAddressField.dataset.address);
            findRouteBetweenTwoAddresses(addressFrom, addressTo);
        } else {
            hitContainer.innerHTML = "Ingen treff!";
        }
    });
};

setHomeButton.onclick = () => {
    lookupAddress(homeAddressField.value, function (data) {
        hitContainer.innerHTML = "";
        data.adresser.forEach(function (item) {
            let newNode = addressToHitNode(item, function(evt){
                setHome(JSON.parse(evt.target.dataset.address));
                hitContainer.innerHTML = "";
            });
            hitContainer.append(newNode);
        });
    });
};
