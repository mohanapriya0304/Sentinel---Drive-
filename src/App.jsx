import React, { useRef, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Menu, Search, CornerUpRight, Utensils, Bed, Camera, Bus, 
  LocateFixed, Plus, Minus, X, Bookmark, Share2, Phone, Globe, MapPin, 
  Navigation as NavIcon, ArrowLeft, ArrowUp, CornerUpLeft, CornerUpRight as TurnRight,
  AlertTriangle, ShieldAlert, Navigation2, CheckCircle
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './index.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CHENNAI_CENTER = [13.0827, 80.2707];
const DEFAULT_START = [13.0655, 80.2612];

const searchPinIcon = new L.DivIcon({
  className: 'search-pin-container',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#EA4335" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const pulseIcon = new L.DivIcon({
  className: 'pulse-icon-container',
  html: '<div class="pulse-dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const navIcon = new L.DivIcon({
  className: 'pulse-icon-container',
  html: '<div class="pulse-dot navigating"></div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const accidentIcon = new L.DivIcon({
  className: 'accident-marker-container',
  html: `<div class="accident-marker"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36]
});

const getNavIcon = (heading) => new L.DivIcon({
  className: 'pulse-icon-container',
  html: `<div class="pulse-dot navigating" style="transform: rotate(${heading}deg);"></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const calculateBearing = (startLat, startLng, destLat, destLng) => {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) - Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

  let brng = Math.atan2(y, x);
  brng = (brng * 180) / Math.PI;
  return (brng + 360) % 360;
};

const ambIcon = new L.DivIcon({
  className: 'ambulance-icon-container',
  html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transform: scaleX(-1);">🚑</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const MapController = ({ target, zoomIn, zoomOut }) => {
  const map = useMap();
  
  useEffect(() => {
    if (target) {
      if (target.bounds) {
        map.flyToBounds(target.bounds, { 
          paddingTopLeft: [420, 50], 
          paddingBottomRight: [50, 50],
          duration: 1.5 
        });
      } else if (target.position) {
        if (target.isNavigating) {
          map.setView(target.position, target.zoom || 15);
        } else {
          map.flyTo(target.position, target.zoom || 15, {
            duration: 1.5,
            easeLinearity: 0.25
          });
        }
      }
    }
  }, [target, map]);

  useEffect(() => { if (zoomIn) map.zoomIn(); }, [zoomIn, map]);
  useEffect(() => { if (zoomOut) map.zoomOut(); }, [zoomOut, map]);
  
  return null;
};

const App = () => {
  const [appMode, setAppMode] = useState('search'); 
  const [currentPos, setCurrentPos] = useState(DEFAULT_START);
  const [vehicleHeading, setVehicleHeading] = useState(0);
  
  const [mapTarget, setMapTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [placeData, setPlaceData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [routeSteps, setRouteSteps] = useState([]);
  const [routeColor, setRouteColor] = useState('#1a73e8');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRouting, setIsRouting] = useState(false);

  // Accident specific state
  const [accidentEvent, setAccidentEvent] = useState(false);
  const [accidentLocation, setAccidentLocation] = useState(null);
  const accidentTriggeredRef = useRef(false);
  const simulationIndexRef = useRef(0);
  const [sosClicked, setSosClicked] = useState(false);
  
  // Dispatch Terminal state
  const [dispatchData, setDispatchData] = useState(null);
  const [driverNotification, setDriverNotification] = useState(null);
  
  // Ambulance Agent state
  const [ambulanceState, setAmbulanceState] = useState({
    status: 'idle',
    location: null,
    destLocation: null,
    routeGeometry: null,
  });
  const ambulanceIntervalRef = useRef(null);

  const [zoomInTrigger, setZoomInTrigger] = useState(0);
  const [zoomOutTrigger, setZoomOutTrigger] = useState(0);

  const driveIntervalRef = useRef(null);

  const handleRecenter = () => {
    setMapTarget({ position: currentPos, zoom: 15, timestamp: Date.now() });
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (!searchQuery.trim()) return;
      
      setIsSearching(true);
      setRouteGeometry(null);
      setCurrentPos(DEFAULT_START);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          const newLoc = [parseFloat(result.lat), parseFloat(result.lon)];
          setSearchedLocation(newLoc);
          setMapTarget({ position: newLoc, zoom: 16, timestamp: Date.now() });
          
          setPlaceData({
            name: result.name || result.display_name.split(',')[0],
            address: result.display_name,
            type: result.type || 'Location'
          });
          setSidebarOpen(true);
          setAppMode('search');
        } else {
          alert("Location not found.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleDirections = async () => {
    if (!searchedLocation) return;
    setIsRouting(true);
    setCurrentPos(DEFAULT_START);
    try {
      const startLoc = DEFAULT_START;
      const endLoc = searchedLocation;
      
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLoc[1]},${startLoc[0]};${endLoc[1]},${endLoc[0]}?overview=full&geometries=geojson&steps=true`);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteGeometry(coordinates);
        
        if (route.legs && route.legs[0].steps) {
           setRouteSteps(route.legs[0].steps);
        }
        
        const durationMin = Math.ceil(route.duration / 60);
        const distanceKm = (route.distance / 1000).toFixed(1);
        setRouteDetails({ time: `${durationMin} min`, distance: `${distanceKm} km` });
        
        const bounds = L.latLngBounds([startLoc, endLoc]);
        setMapTarget({ bounds: bounds, timestamp: Date.now() });
        setRouteColor('#1a73e8');
        setSidebarOpen(false);
        setAppMode('directions');
      } else {
        alert("Could not find a route.");
      }
    } catch (error) {
      console.error(error);
      alert("Error calculating route.");
    } finally {
      setIsRouting(false);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSearchedLocation(null);
    setRouteGeometry(null);
  };

  const closeDirections = () => {
    setAppMode('search');
    setRouteGeometry(null);
    setRouteDetails(null);
    setRouteSteps([]);
    setAccidentEvent(false);
    setAccidentLocation(null);
    setSidebarOpen(true);
    setMapTarget({ position: searchedLocation, zoom: 16, timestamp: Date.now() });
  };

  const runSimulation = (geometry, steps) => {
    if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    
    driveIntervalRef.current = setInterval(() => {
      simulationIndexRef.current += 1; 
      const index = simulationIndexRef.current;
      
      if (index >= geometry.length) {
        clearInterval(driveIntervalRef.current);
        return;
      }
      
      const newPos = geometry[index];
      const prevPos = index > 0 ? geometry[index - 1] : newPos;
      
      if (prevPos[0] !== newPos[0] || prevPos[1] !== newPos[1]) {
        const brng = calculateBearing(prevPos[0], prevPos[1], newPos[0], newPos[1]);
        setVehicleHeading(brng);
      }
      
      setCurrentPos(newPos);
      setMapTarget({ position: newPos, zoom: 18, timestamp: Date.now(), isNavigating: true });
      
      if (steps && steps.length > 0) {
        const progress = index / geometry.length;
        const stepIdx = Math.min(Math.floor(progress * steps.length), steps.length - 1);
        setCurrentStepIndex(stepIdx);
      }
      
      if (index === 10 && !accidentTriggeredRef.current) {
        accidentTriggeredRef.current = true;
        
        // STOP the location (pause simulation)
        clearInterval(driveIntervalRef.current);
        
        // Mark the exact accident point 2km ahead
        const accIdx = Math.min(index + 25, geometry.length - 1);
        setAccidentLocation(geometry[accIdx]);
        setAccidentEvent(true);
      }
      
    }, 400); 
  };

  const startNavigation = () => {
    setAppMode('navigation');
    setCurrentStepIndex(0);
    simulationIndexRef.current = 0;
    accidentTriggeredRef.current = false;
    setAccidentEvent(false);
    setAccidentLocation(null);
    setSosClicked(false);
    setDispatchData(null);
    setDriverNotification(null);
    setAmbulanceState({ status: 'idle', location: null, destLocation: null, routeGeometry: null });
    if (ambulanceIntervalRef.current) clearInterval(ambulanceIntervalRef.current);
    setMapTarget({ position: currentPos, zoom: 18, timestamp: Date.now(), isNavigating: true });
    
    if (!routeGeometry) return;
    runSimulation(routeGeometry, routeSteps);
  };

  const handleAcceptReroute = async () => {
    setAccidentEvent(false);
    setAccidentLocation(null);
    
    if (!searchedLocation) return;
    const endLoc = searchedLocation;
    
    const midLat = (currentPos[0] + endLoc[0]) / 2;
    const midLng = (currentPos[1] + endLoc[1]) / 2;
    const viaLat = midLat + 0.01;
    const viaLng = midLng - 0.01;
    
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${currentPos[1]},${currentPos[0]};${viaLng},${viaLat};${endLoc[1]},${endLoc[0]}?overview=full&geometries=geojson&steps=true`);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const newGeom = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        const newSteps = route.legs.flatMap(leg => leg.steps); 
        
        setRouteGeometry(newGeom);
        setRouteSteps(newSteps);
        setRouteColor('#0f9d58'); 
        
        const durationMin = Math.ceil(route.duration / 60);
        setRouteDetails(prev => ({
          ...prev,
          time: `${durationMin} min`
        }));
        
        simulationIndexRef.current = 0;
        runSimulation(newGeom, newSteps);
      }
    } catch (err) {
      console.error("Failed to reroute", err);
    }
  };

  const handleDismissAccident = () => {
    setAccidentEvent(false);
    
    // Resume map simulation on the current original route
    runSimulation(routeGeometry, routeSteps);
  };

  const playWarningSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); 
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.2); 
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.4);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  const handleSOS = async () => {
    playWarningSound();
    
    // Lock the exact accident point address
    const lat = accidentLocation ? accidentLocation[0] : currentPos[0];
    const lng = accidentLocation ? accidentLocation[1] : currentPos[1];
    
    setDispatchData({
      status: 'AWAITING DISPATCHER CONFIRMATION',
      time: new Date().toLocaleTimeString(),
      lat: lat,
      lng: lng,
      coordinates: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      address: 'Resolving exact location...'
    });

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      setDispatchData(prev => ({
        ...prev,
        address: data.display_name || 'Location unavailable',
      }));
    } catch (err) {
      setDispatchData(prev => ({
        ...prev,
        address: 'Unable to resolve address. Using raw GPS coordinates.',
      }));
    }

    setSosClicked(true);
    
    // Do not resume map yet. Wait for the user to select Reroute or Continue.
  };

  const handleConfirmDispatch = async () => {
    setDispatchData(prev => ({ ...prev, status: 'RESCUE DISPATCHED' }));
    setDriverNotification("Help is on the way. Estimated arrival: 5 mins.");
    setTimeout(() => { setDriverNotification(null); }, 6000);
    
    if (!dispatchData) return;
    const destLat = dispatchData.lat;
    const destLng = dispatchData.lng;
    
    // Generate starting point for Ambulance
    const startLat = destLat - 0.015;
    const startLng = destLng + 0.015;
    
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const newGeom = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        // Push full state to Ambulance Terminal instantly
        setAmbulanceState({
          status: 'alerting',
          location: [startLat, startLng],
          destLocation: [destLat, destLng],
          routeGeometry: newGeom
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAmbulanceAccept = () => {
    setAmbulanceState(prev => ({ ...prev, status: 'responding' }));
    
    // Pan MAIN map to show both
    if (ambulanceState.location && ambulanceState.destLocation) {
      const bounds = L.latLngBounds([ambulanceState.location, ambulanceState.destLocation]);
      setMapTarget({ bounds: bounds, timestamp: Date.now() });
    }
    
    // Start Ambulance Movement
    let ambIndex = 0;
    const newGeom = ambulanceState.routeGeometry;
    
    if (ambulanceIntervalRef.current) clearInterval(ambulanceIntervalRef.current);
    ambulanceIntervalRef.current = setInterval(() => {
      ambIndex += 1;
      if (ambIndex >= newGeom.length) {
        clearInterval(ambulanceIntervalRef.current);
        setAmbulanceState(prev => ({ ...prev, status: 'arrived' }));
        return;
      }
      setAmbulanceState(prev => ({ ...prev, location: newGeom[ambIndex] }));
    }, 200); 
  };

  const handleMapView = () => {
    if (dispatchData && dispatchData.lat) {
       setMapTarget({ position: [dispatchData.lat, dispatchData.lng], zoom: 18, timestamp: Date.now() });
    }
  };

  const exitNavigation = () => {
    if (driveIntervalRef.current) clearInterval(driveIntervalRef.current);
    if (ambulanceIntervalRef.current) clearInterval(ambulanceIntervalRef.current);
    setAppMode('directions');
    setCurrentPos(DEFAULT_START); 
    setCurrentStepIndex(0);
    setAccidentEvent(false);
    setAccidentLocation(null);
    setSosClicked(false);
    setDispatchData(null);
    setDriverNotification(null);
    setAmbulanceState({ status: 'idle', location: null, destLocation: null, routeGeometry: null });
    
    if (searchedLocation) {
      const bounds = L.latLngBounds([DEFAULT_START, searchedLocation]);
      setMapTarget({ bounds: bounds, timestamp: Date.now() });
    }
  };

  const isShifted = sidebarOpen || appMode === 'directions';

  const getInstruction = () => {
    if (!routeSteps || routeSteps.length === 0) return { text: "Follow the route", sub: "", icon: ArrowUp };
    const step = routeSteps[currentStepIndex];
    if (!step || !step.maneuver) return { text: "Follow the route", sub: "", icon: ArrowUp };
    
    let text = `${step.maneuver.type} ${step.maneuver.modifier || ''}`.trim();
    if (step.name) text += ` onto ${step.name}`;
    if (step.maneuver.type === 'arrive') text = "You have arrived at your destination";
    if (step.maneuver.type === 'depart') text = `Head ${step.maneuver.modifier || 'forward'} on ${step.name || 'the road'}`;
    
    let IconComponent = ArrowUp;
    if (step.maneuver.modifier?.includes('right')) IconComponent = TurnRight;
    if (step.maneuver.modifier?.includes('left')) IconComponent = CornerUpLeft;
    
    return { text: text, sub: step.distance ? `In ${(step.distance).toFixed(0)}m` : '', icon: IconComponent };
  };

  const navInfo = getInstruction();

  return (
    <div className="app-container">
      {/* 60-70% Left Split: The Map & Driver View */}
      <div className="map-panel">
        
        {driverNotification && (
          <div className="driver-notification">
            <CheckCircle size={24} /> {driverNotification}
          </div>
        )}

        <div className={`gm-search-container ${appMode !== 'search' ? 'hidden' : ''} ${sidebarOpen ? 'shifted' : ''}`}>
          <div className="gm-search-box" style={{ opacity: isSearching ? 0.7 : 1 }}>
            <button className="gm-icon-btn"><Menu size={20} /></button>
            <input 
              type="text" 
              placeholder="Search Google Maps" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              disabled={isSearching}
            />
            <button className="gm-icon-btn" onClick={handleSearch}><Search size={20} /></button>
            <div className="gm-divider" />
            <button className="gm-icon-btn blue" onClick={handleDirections}><CornerUpRight size={20} /></button>
          </div>
          
          <div className="gm-categories">
            <button className="gm-chip"><Utensils size={14}/> Restaurants</button>
            <button className="gm-chip"><Bed size={14}/> Hotels</button>
            <button className="gm-chip"><Camera size={14}/> Things to do</button>
            <button className="gm-chip"><Bus size={14}/> Transit</button>
          </div>
        </div>

        <div className={`gm-sidebar ${sidebarOpen && appMode === 'search' ? 'open' : ''} ${appMode !== 'search' ? 'hidden' : ''}`}>
          <div 
            className="gm-sidebar-header"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=800&auto=format&fit=crop)' }}
          >
            <button className="gm-sidebar-close" onClick={closeSidebar}>
              <X size={20} />
            </button>
          </div>
          
          {placeData && (
            <div className="gm-sidebar-content">
              <h1 className="gm-sidebar-title">{placeData.name}</h1>
              <div className="gm-sidebar-subtitle">{placeData.type.charAt(0).toUpperCase() + placeData.type.slice(1)}</div>
              
              <div className="gm-action-buttons">
                <button className="gm-action-btn primary" onClick={handleDirections} disabled={isRouting}>
                  <div className="icon-circle"><NavIcon size={18} fill="currentColor" /></div>
                  <span>{isRouting ? 'Routing...' : 'Directions'}</span>
                </button>
                <button className="gm-action-btn">
                  <div className="icon-circle"><Bookmark size={18} /></div>
                  <span>Save</span>
                </button>
                <button className="gm-action-btn">
                  <div className="icon-circle"><Share2 size={18} /></div>
                  <span>Share</span>
                </button>
              </div>

              <div className="gm-info-row">
                <MapPin size={20} />
                <span>{placeData.address}</span>
              </div>
            </div>
          )}
        </div>

        {/* Directions Panel */}
        <div className={`gm-directions-panel ${appMode === 'directions' ? 'open' : ''}`}>
          <div className="gm-directions-header">
            <div className="gm-directions-top-row">
              <button className="gm-directions-back" onClick={closeDirections}>
                <ArrowLeft size={24} />
              </button>
              <div className="gm-directions-inputs-container">
                <div className="gm-dir-input-wrapper">
                  <input value="Your location" disabled />
                </div>
                <div className="gm-dir-input-wrapper" style={{ borderColor: 'white', background: 'transparent' }}>
                  <input value={placeData?.name || searchQuery} readOnly />
                  <X size={16} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={closeDirections} />
                </div>
              </div>
            </div>
          </div>

          <div className="gm-directions-content">
            {routeDetails && (
              <div className="gm-route-card">
                <div>
                  <h2 className="gm-route-title">{routeDetails.time}</h2>
                  <div className="gm-route-subtitle">{routeDetails.distance} &middot; Fastest route</div>
                </div>
                <button className="gm-start-btn" onClick={startNavigation}>
                  <NavIcon size={18} fill="currentColor" />
                  Start
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation UI Overlay */}
        {appMode === 'navigation' && (
          <div className="gm-nav-overlay">
            <div className="gm-nav-header">
              <div className="gm-nav-icon">
                <navInfo.icon size={36} />
                <span className="gm-nav-distance">{navInfo.sub}</span>
              </div>
              <div className="gm-nav-text">
                <div className="gm-nav-instruction" style={{ textTransform: 'capitalize' }}>{navInfo.text}</div>
              </div>
            </div>
            
            <div className="gm-nav-bottom">
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="gm-nav-bottom-time">{routeDetails?.time}</span>
                <span className="gm-nav-bottom-stats">{routeDetails?.distance}</span>
              </div>
              <button className="gm-nav-exit" onClick={exitNavigation}>
                <X size={20} strokeWidth={3} /> Exit
              </button>
            </div>
            
            {accidentEvent && !sosClicked && (
              <button className="gm-sos-button" onClick={handleSOS} title="Report Emergency" style={{ animation: 'pulse-sos 1.5s infinite' }}>
                <AlertTriangle size={28} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Accident Popup Overlay - Appears only AFTER SOS is clicked */}
        {accidentEvent && sosClicked && (
          <div className="gm-accident-popup">
            <div className="gm-accident-title">
              <AlertTriangle size={24} /> Hazard Transmitted
            </div>
            <div className="gm-accident-desc">
              Warning: Incident 2 km ahead has been reported to Dispatch. The current route is blocked. Please take the diversion.
            </div>
            <div className="gm-accident-actions">
              <button className="gm-accident-btn accept" onClick={handleAcceptReroute} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                Take Diversion
              </button>
            </div>
          </div>
        )}

        {/* Map Controls */}
        <div className={`gm-bottom-left ${isShifted ? 'shifted' : ''} ${appMode === 'navigation' ? 'hidden' : ''}`}>
          <div className="gm-layers-card">
            <div className="preview"></div>
            <div className="gm-layers-text">Layers</div>
          </div>
        </div>

        <div className={`gm-bottom-right ${appMode === 'navigation' ? 'hidden' : ''}`}>
          <button className="gm-circle" onClick={handleRecenter} title="Show your location">
            <LocateFixed size={20} />
          </button>
          <div className="gm-zoom-controls">
            <button onClick={() => setZoomInTrigger(Date.now())}><Plus size={20} /></button>
            <button onClick={() => setZoomOutTrigger(Date.now())}><Minus size={20} /></button>
          </div>
        </div>

        <MapContainer 
          center={CHENNAI_CENTER} 
          zoom={13} 
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="google-tiles"
          />
          
          {routeGeometry && (
            <Polyline 
              positions={routeGeometry} 
              pathOptions={{ 
                color: routeColor,
                weight: appMode === 'navigation' ? 8 : 6, 
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
          )}

          <Marker position={currentPos} icon={appMode === 'navigation' ? getNavIcon(vehicleHeading) : pulseIcon} zIndexOffset={1000} />

          {accidentLocation && (
            <Marker position={accidentLocation} icon={accidentIcon} zIndexOffset={1001} />
          )}

          {searchedLocation && appMode !== 'search' && ( <></> )}
          {searchedLocation && appMode !== 'navigation' && (
            <Marker position={searchedLocation} icon={searchPinIcon} zIndexOffset={1001} />
          )}
          
          {/* Ambulance Map Elements */}
          {ambulanceState.routeGeometry && ambulanceState.status !== 'alerting' && (
            <Polyline 
              positions={ambulanceState.routeGeometry} 
              pathOptions={{ color: '#d93025', weight: 6, dashArray: '10, 10', opacity: 0.9 }} 
            />
          )}

          {ambulanceState.location && ambulanceState.status !== 'alerting' && (
            <Marker position={ambulanceState.location} icon={ambIcon} zIndexOffset={1005} />
          )}

          <MapController target={mapTarget} zoomIn={zoomInTrigger} zoomOut={zoomOutTrigger} />
        </MapContainer>
      </div>

      {/* 30-40% Right Split: The Terminals */}
      <div className="right-sidebar">
        
        {/* Top: Dispatch Terminal */}
        <div className="dispatch-panel">
          <div className="dispatch-panel-header">
            <ShieldAlert size={24} color="#1a73e8" /> DISPATCH TERMINAL
          </div>
          <div className="dispatch-panel-content">
            {!dispatchData ? (
              <div className="dispatch-empty">
                No active incidents reported. <br/> Standing by...
              </div>
            ) : (
              <div className="dispatch-alert-card">
                <div className="dispatch-alert-header">
                  <AlertTriangle size={18} /> ⚠️ CRITICAL INCIDENT REPORTED
                </div>
                <div className="dispatch-alert-body">
                  <div className="dispatch-alert-row">
                    <span className="dispatch-alert-label">Incident Address</span>
                    <span className="dispatch-alert-value">{dispatchData.address}</span>
                  </div>
                  <div className="dispatch-alert-row">
                    <span className="dispatch-alert-label">GPS Coordinates</span>
                    <span className="dispatch-alert-value" style={{ fontFamily: 'monospace' }}>{dispatchData.coordinates}</span>
                  </div>
                  <div className="dispatch-alert-row">
                    <span className="dispatch-alert-label">Report Time</span>
                    <span className="dispatch-alert-value">{dispatchData.time}</span>
                  </div>
                  <div className="dispatch-alert-row">
                    <span className="dispatch-alert-label">Dispatch Status</span>
                    <span className="dispatch-alert-value" style={{ color: dispatchData.status.includes('RESCUE') ? '#188038' : '#e37400', fontWeight: 'bold' }}>
                      {dispatchData.status}
                    </span>
                  </div>
                </div>
                <div className="dispatch-actions">
                  <button 
                    className="dispatch-btn confirm" 
                    onClick={handleConfirmDispatch}
                    disabled={dispatchData.status.includes('RESCUE')}
                    style={{ width: '100%' }}
                  >
                    <CheckCircle size={16} /> CONFIRM RECEIPT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Ambulance Terminal (appears when alerted) */}
        {ambulanceState.status !== 'idle' && (
          <div className="ambulance-terminal">
            <div className={`ambulance-terminal-header ${ambulanceState.status === 'alerting' ? 'alerting' : ''}`}>
              🚨 AMBULANCE RESPONSE UNIT
            </div>
            <div className="terminal-content">
              {ambulanceState.routeGeometry && ambulanceState.location && ambulanceState.destLocation && (
                <div className="terminal-minimap">
                  <MapContainer 
                    bounds={L.latLngBounds([ambulanceState.location, ambulanceState.destLocation])} 
                    zoomControl={false}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="google-tiles" />
                    <Polyline 
                      positions={ambulanceState.routeGeometry} 
                      pathOptions={{ color: '#d93025', weight: 4, dashArray: '8, 8' }} 
                    />
                    <Marker position={ambulanceState.location} icon={ambIcon} />
                    <Marker position={ambulanceState.destLocation} icon={accidentIcon} />
                  </MapContainer>
                </div>
              )}
              
              <div className="terminal-card">
                <div className="dispatch-alert-row" style={{ marginBottom: '12px' }}>
                  <span className="dispatch-alert-label">Destination</span>
                  <span className="dispatch-alert-value" style={{ fontSize: '13px' }}>{dispatchData?.address}</span>
                </div>
                <div className="dispatch-alert-row">
                  <span className="dispatch-alert-label">Status</span>
                  <span className="dispatch-alert-value" style={{ color: ambulanceState.status === 'arrived' ? '#188038' : '#d93025', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {ambulanceState.status}
                  </span>
                </div>
              </div>

              {ambulanceState.status === 'alerting' && (
                <button className="pager-accept" onClick={handleAmbulanceAccept}>
                  ACCEPT & RESPOND
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
