import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { fetchWithAuth } from '../api';

// Create custom icons
const createIcon = (color, svgPath) => new L.DivIcon({
  html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${svgPath}
          </svg>
         </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const customerIcon = createIcon('#3b82f6', '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>');
const partnerIcon = createIcon('#10b981', '<path d="M5 12h14"></path><path d="M12 5v14"></path><path d="M12 12l7 -7"></path><path d="M12 12l-7 -7"></path><path d="M12 12l7 7"></path><path d="M12 12l-7 7"></path>'); // Star/Car shape

const LiveTrackingMap = ({ booking, onClose }) => {
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const eventSourceRef = useRef(null);
  
  const customerLat = booking.customerLatitude;
  const customerLon = booking.customerLongitude;
  
  useEffect(() => {
    // Initial partner location from booking if available
    if (booking.partnerLatitude && booking.partnerLongitude) {
      setPartnerLocation([booking.partnerLatitude, booking.partnerLongitude]);
      if (booking.partnerLocationUpdatedAt) {
        setLastUpdated(new Date(booking.partnerLocationUpdatedAt));
      }
    }
  }, [booking]);

  useEffect(() => {
    let mounted = true;

    const startTracking = async () => {
      try {
        const { data } = await fetchWithAuth(`/bookings/${booking.id}/tracking/stream`, { method: 'POST' });
        if (!mounted) return;
        
        const { url } = data;
        const sse = new EventSource(`${import.meta.env.VITE_API_URL}${url}`);
        eventSourceRef.current = sse;
        
        sse.addEventListener('location-update', (event) => {
          const loc = JSON.parse(event.data);
          setPartnerLocation([loc.latitude, loc.longitude]);
          setLastUpdated(new Date());
          setStreamError(null);
        });
        
        sse.onerror = () => {
          console.warn("SSE connection error");
          setStreamError("Connection lost. Reconnecting...");
          // EventSource auto-reconnects, but we can manage state
        };
        
      } catch (err) {
        if (mounted) setStreamError("Failed to start tracking session.");
        console.error(err);
      }
    };
    
    startTracking();
    
    return () => {
      mounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [booking.id]);

  // Calculate distance in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };
  
  const distance = partnerLocation ? calculateDistance(customerLat, customerLon, partnerLocation[0], partnerLocation[1]) : null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-base-100 rounded-xl overflow-hidden w-full max-w-3xl flex flex-col h-[80vh] shadow-xl">
        
        {/* Header */}
        <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-100 relative z-10">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-info animate-pulse"></span>
              Live Tracking
            </h3>
            <p className="text-sm text-base-content/70">
              {booking.partner.firstName} is on the way
            </p>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">✕</button>
        </div>
        
        {/* Map */}
        <div className="flex-1 relative bg-base-200">
          {!customerLat || !customerLon ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
              <div>
                <p className="text-lg font-semibold">Location Data Unavailable</p>
                <p className="text-sm text-base-content/70">We don't have the exact coordinates for your address.</p>
              </div>
            </div>
          ) : (
            <MapContainer 
              center={[customerLat, customerLon]} 
              zoom={13} 
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              <Marker position={[customerLat, customerLon]} icon={customerIcon}>
                <Popup>Your Location</Popup>
              </Marker>
              
              {partnerLocation && (
                <Marker position={partnerLocation} icon={partnerIcon}>
                  <Popup>{booking.partner.firstName}</Popup>
                </Marker>
              )}
            </MapContainer>
          )}
          
          {/* Status Overlay */}
          {streamError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-error text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg z-[400]">
              {streamError}
            </div>
          )}
        </div>
        
        {/* Footer Info */}
        <div className="p-4 bg-base-100 border-t border-base-200 grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Distance</span>
            <span className="text-lg font-bold">{distance ? `${distance} km` : 'Calculating...'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-base-content/50 uppercase tracking-wider">Last Updated</span>
            <span className="text-lg font-bold text-info">
              {lastUpdated ? lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : 'Waiting for signal...'}
            </span>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default LiveTrackingMap;
