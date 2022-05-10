import { useEffect, useRef, useState } from 'react';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import tt from '@tomtom-international/web-sdk-maps';
import * as ttapi from "@tomtom-international/web-sdk-services"
import './App.css';

// Helpers ----------------------------------------------------------------------
const addMarker = ({
  map,
  longitude, 
  latitude,
  title,
  onDrag
}) => {
  const popupOffset = {
    bottom: [0, -25]
  }

  const popup = new tt.Popup({ offset: popupOffset }).setHTML(title)
  const element = document.createElement('div');
  element.className = 'marker';

  const marker = new tt.Marker({
    draggable: true,
    element: element,
  }).setLngLat([longitude, latitude]).addTo(map);

  marker.on('dragend', () => onDrag(marker));
  marker.setPopup(popup);
}


// Main component ----------------------------------------------------------------------
const App = () => {
  const [ map, setMap ] = useState({});
  const [ longitude, setLongitude ] = useState(13.8307872);
  const [ latitude, setLatitude ] = useState(41.5031958);
  const [ destinations, setDestinations ] = useState([]);
  const mapElement = useRef();

  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if(map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': '#4a90e2',
        'line-width': 6
  
      }
    })
  }

  const addDeliveryMarker = (lngLat, map) => {
    const element = document.createElement("div");
    element.className = "marker-delivery";
    new tt.Marker({
      element: element
    })
    .setLngLat(lngLat)
    .addTo(map);
  }

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude
    }

    const destinations = [];

    let map = tt.map({
      key: process.env.REACT_APP_TOM_TOM_API_KEY,
      container: mapElement.current,
      center: [longitude, latitude],
      zoom: 14
    });

    addMarker({
      map,
      longitude,
      latitude,
      title: "Primo marker",
      onDrag: (marker) => handleDrag(marker)
    });
    
    setMap(map);

    const sortDestinations = (locations) => {
      const pointsForDestinations = locations.map(destination => {
        return convertToPoints(destination)
      })

      const callParameters = {
        key: process.env.REACT_APP_TOM_TOM_API_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)]
      }

      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
          .then(matrixAPIResults => {
            const results = matrixAPIResults.matrix[0];
            const resultsArray = results.map((result, index) => {
              return {
                location: locations[index],
                drivingTime: result.response.routeSummary.travelTimeInSeconds
              }
            })

            resultsArray.sort((a,b) => {
              return a.drivingTime - b.drivingTime
            })

            const sortedLocations = resultsArray.map((result) => {
              return result.location;
            })

            resolve(sortedLocations);
          })
      })
    }

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin);
        ttapi.services
          .calculateRoute({
            key: process.env.REACT_APP_TOM_TOM_API_KEY,
            locations: sorted,
          })
          .then(routeData => {
            const geoJson = routeData.toGeoJson();
            drawRoute(geoJson, map)
          })
      })
    }

    map.on("click", (e) => {
      destinations.push(e.lngLat);
      addDeliveryMarker(e.lngLat, map);
      recalculateRoutes();
    })

    return () => map.remove();
  }, [latitude, longitude]);
  
  // Set initial marker as center of the view (need to recreate the entire map)
  const reposition = () => {
    let map = tt.map({
      key: process.env.REACT_APP_TOM_TOM_API_KEY,
      container: mapElement.current,
      center: [longitude, latitude],
      zoom: 14
    });

    addMarker({
      map,
      longitude,
      latitude,
      title: "Primo marker",
      onDrag: (marker) => handleDrag(marker)
    });

    setMap(map);
  }

  const handleDrag = (marker) => {
    const lngLat = marker.getLngLat();
    setLongitude(lngLat.lng);
    setLatitude(lngLat.lat);
  }

  return <>
    { map && <div className="app">
      <div
        ref={mapElement}
        className="mapDiv"
      />

      <div className='search-bar'>
        <h1>Dove?</h1>
        <div>
          <input
            type="text"
            id="longitude"
            className='longitude'
            placeholder='Put in longitude'
            value={longitude}
            onChange={({ target: { value }}) => setLongitude(value)}
          />

          <input
            type="text"
            id="latitude"
            className='latitude'
            placeholder='Put in latitude'
            value={latitude}
            onChange={({ target: { value }}) => setLatitude(value)}
          />

          <button onClick={() => reposition({ mapElement, longitude, latitude, setMap })}>
            Riposiziona
          </button>
        </div>

        <div>
          <input
            type="text"
            id="longitude"
            className='longitude'
            placeholder='Put in longitude'
            value={longitude}
            onChange={({ target: { value }}) => setLongitude(value)}
          />

          <input
            type="text"
            id="latitude"
            className='latitude'
            placeholder='Put in latitude'
            value={latitude}
            onChange={({ target: { value }}) => setLatitude(value)}
          />

          <button onClick={() => setDestinations((prev) => prev.concat())}>
            Aggiungi
          </button>
        </div>
      </div>
    </div> }
  </>;
}

export default App;
