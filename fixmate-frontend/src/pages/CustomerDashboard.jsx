import React, { useEffect, useRef, useState } from 'react'
import {
  MapPin, Search, Siren, CalendarDays, ChevronLeft, ChevronRight,
  Plus, Navigation, Star, ShieldCheck, X, Briefcase,
  CheckCircle2, User, Wallet, BadgeCheck, Clock, Zap, Users,
  ChevronDown, RefreshCw, Loader2
} from 'lucide-react'
import { API_URL, fetchWithAuth } from '../api'
import Dropdown from '../components/Dropdown'
import { getBrowserPosition, validateLocation } from '../utils/location'
import LocationModal, { getStoredLocation, saveStoredLocation } from '../components/LocationModal'
import { reverseGeocode } from '../utils/reverseGeocode'
import SmartSearch from '../components/SmartSearch'
import Modal from '../components/ui/Modal'
import BookingTracking from '../components/BookingTracking'
import Avatar from '../components/ui/Avatar'
import ServiceIcon from '../components/ui/ServiceIcon'
import { RatingStars, StarSelector, RatingDistribution } from '../components/ui/RatingStars'
import Stepper from '../components/ui/Stepper'
import MobileNav from '../components/ui/MobileNav'
import { MOBILE_NAV_ICONS } from '../components/ui/navIcons'
import { SkeletonList } from '../components/ui/Skeleton'
import SavedAddressesModal from '../components/SavedAddressesModal'
import './Dashboard.css'

const emptyAddress = {
  buildingName: '', street: '', city: '', state: '', zipCode: '', country: 'India',
  latitude: '', longitude: ''
};

const BOOKING_STEPS = [
  { label: 'Service' }, { label: 'Location' }, { label: 'Schedule' },
  { label: 'Partners' }, { label: 'Confirm' }
];

const STATUS_PIPELINE = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
const PIPELINE_LABELS = {
  PENDING: 'Request Sent', ACCEPTED: 'Partner Accepted',
  IN_PROGRESS: 'Service Started', COMPLETED: 'Completed'
};

/**
 * Format a timestamp into a human-readable relative time string.
 * e.g. "5 min ago", "2 hrs ago", "1 day ago"
 */
function formatLastActive(timestamp) {
  if (!timestamp) return 'Unknown'
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Format distance for display.
 * < 1 km → "450 m", >= 1 km → "1.2 km"
 */
function formatDistance(km) {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${Math.round(km * 10) / 10} km`
}

export default function CustomerDashboard() {
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [mobileNav, setMobileNav] = useState('home');

  // ── Location state (synced with Navbar via localStorage + events) ──
  const [customerLocation, setCustomerLocation] = useState(() => getStoredLocation());

  // New Booking State
  const [showModal, setShowModal] = useState(false);
  const [bookingType, setBookingType] = useState('scheduled');
  const [bookingStep, setBookingStep] = useState(0);
  const [bookingLocationModalOpen, setBookingLocationModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [locating, setLocating] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [heroFilter, setHeroFilter] = useState('');
  // Location flow
  const [confirmedLocation, setConfirmedLocation] = useState(null);
  const [pendingLat, setPendingLat] = useState('');
  const [pendingLon, setPendingLon] = useState('');
  const [locationMsg, setLocationMsg] = useState(null);

  // Search flow
  const [searching, setSearching] = useState(false);
  const [foundPartners, setFoundPartners] = useState([]);
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const liveStreamRef = useRef(null);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [searchEmptyMessage, setSearchEmptyMessage] = useState('');
  const [lastSearchLocation, setLastSearchLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [savingBooking, setSavingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  // View Profile
  const [profilePartner, setProfilePartner] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Booking details modal
  const [detailsBooking, setDetailsBooking] = useState(null);

  const bookingsRef = useRef(null);

  // ── Listen for location changes from Navbar ──
  useEffect(() => {
    const handleLocationChange = (e) => {
      const loc = e.detail
      setCustomerLocation(loc)
      // Also sync the confirmed location inside the modal
      if (loc && loc.latitude && loc.longitude) {
        setConfirmedLocation({ latitude: loc.latitude, longitude: loc.longitude })
        setPendingLat(String(loc.latitude))
        setPendingLon(String(loc.longitude))
      }
    }
    const handleLocationCleared = () => {
      setCustomerLocation(null)
      setConfirmedLocation(null)
      setPendingLat('')
      setPendingLon('')
    }
    window.addEventListener('fixmate-location-changed', handleLocationChange)
    window.addEventListener('fixmate-location-cleared', handleLocationCleared)
    return () => {
      window.removeEventListener('fixmate-location-changed', handleLocationChange)
      window.removeEventListener('fixmate-location-cleared', handleLocationCleared)
    }
  }, [])

  // ── Sync confirmed location from stored location on mount ──
  useEffect(() => {
    const stored = getStoredLocation()
    if (stored && stored.latitude && stored.longitude) {
      setConfirmedLocation({ latitude: stored.latitude, longitude: stored.longitude })
      setPendingLat(String(stored.latitude))
      setPendingLon(String(stored.longitude))
    }
  }, [])

  // ── Ref to hold latest openBookingModal (avoids TDZ in minified builds) ──
  const openBookingModalRef = useRef(null);

  // ── Listen for smart search selection from Navbar ──
  useEffect(() => {
    const handleSearchSelect = (e) => {
      const { entry, categoryName } = e.detail
      if (!entry) return

      // Find the matching category from loaded categories
      const matchCat = categories.find((c) =>
        c.name.toLowerCase() === (categoryName || '').toLowerCase()
      )

      if (openBookingModalRef.current) {
        if (matchCat) {
          openBookingModalRef.current('scheduled', String(matchCat.id))
        } else {
          openBookingModalRef.current('scheduled')
        }
      }

      // Clear the hero filter since user made a search
      setHeroFilter('')
    }
    window.addEventListener('fixmate-search-select', handleSearchSelect)
    return () => window.removeEventListener('fixmate-search-select', handleSearchSelect)
  }, [categories])

  useEffect(() => {
    loadBookings();
    loadCategories();
    return () => closeLiveStream();
  }, []);

  const loadBookings = async () => {
    try {
      const { data } = await fetchWithAuth('/bookings/customer');
      if (data.success) setBookings(data.data);
    } catch (err) {
      console.error('Failed to load bookings', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await fetchWithAuth('/categories');
      if (data.success && Array.isArray(data.data)) setCategories(data.data);
    } catch (err) {
      console.error('Failed to load categories', err.message);
    }
  };

  function closeLiveStream() {
    if (liveStreamRef.current) {
      liveStreamRef.current.close();
      liveStreamRef.current = null;
    }
    setLiveStreamActive(false);
  };

  const openLiveStream = async (categoryId, location) => {
    closeLiveStream();
    try {
      const { data } = await fetchWithAuth('/search/nearby/stream', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          latitude: location.latitude,
          longitude: location.longitude
        })
      });
      if (!data.success || !data.data?.url) return;
      const es = new EventSource(`${API_URL}${data.data.url}`);
      liveStreamRef.current = es;
      setLiveStreamActive(true);
      es.addEventListener('partners', (e) => {
        const list = JSON.parse(e.data);
        setFoundPartners(list);
        setSearchEmpty(list.length === 0);
        setSearchEmptyMessage(
          list.length === 0
            ? 'Live update: all nearby partners just went offline or moved out of range. They will reappear here automatically if they come back.'
            : ''
        );
      });
      es.onerror = () => {
        es.close();
        if (liveStreamRef.current === es) liveStreamRef.current = null;
        setLiveStreamActive(false);
      };
    } catch (err) {
      console.error('Live updates unavailable', err.message);
      setLiveStreamActive(false);
    }
  };

  function resetBookingModal() {
    closeLiveStream();
    setBookingError('');
    setBookingSuccess('');
    setSearching(false);
    setFoundPartners([]);
    setSearchEmpty(false);
    setSearchEmptyMessage('');
    setLastSearchLocation(null);
    setSearchRadius(null);
    setSelectedPartner(null);
    setNotes('');
    setScheduledDate('');
    setSelectedCategory('');
    setSelectedAddress('');
    setAddressForm(emptyAddress);
    setShowAddressForm(false);
    setBookingStep(0);
  };

  async function openBookingModal(type = 'scheduled', categoryId = '') {
    setBookingType(type);
    setShowModal(true);
    resetBookingModal();
    if (categoryId) setSelectedCategory(String(categoryId));
    try {
      const [cats, addrs] = await Promise.all([
        fetchWithAuth('/categories'),
        fetchWithAuth('/addresses')
      ]);
      if (cats.data.success) setCategories(cats.data.data);
      if (addrs.data.success) setAddresses(addrs.data.data);
      if (confirmedLocation) {
        setPendingLat(String(confirmedLocation.latitude));
        setPendingLon(String(confirmedLocation.longitude));
      }
    } catch (err) {
      setBookingError(err.message);
    }
  };

  // Keep the ref pointing to the latest openBookingModal
  openBookingModalRef.current = openBookingModal;

  const useMyCurrentLocation = async () => {
    setLocating(true);
    setLocationMsg(null);
    const res = await getBrowserPosition();
    if (res.success) {
      const geo = await reverseGeocode(res.coords.latitude, res.coords.longitude);
      setPendingLat(String(res.coords.latitude));
      setPendingLon(String(res.coords.longitude));
      setConfirmedLocation({ latitude: res.coords.latitude, longitude: res.coords.longitude });
      saveStoredLocation(geo);
      setCustomerLocation(geo);
      window.dispatchEvent(new CustomEvent('fixmate-location-changed', { detail: geo }));
      setLocationMsg({ type: 'success', text: geo.name });
    } else {
      setLocationMsg({ type: 'error', text: res.error });
    }
    setLocating(false);
  };

  const handleSetLocation = async () => {
    const result = validateLocation(pendingLat, pendingLon);
    if (result.error) {
      setLocationMsg({ type: 'error', text: result.error });
      return;
    }
    setPendingLat(String(result.latitude));
    setPendingLon(String(result.longitude));
    setConfirmedLocation({ latitude: result.latitude, longitude: result.longitude });
    const geo = await reverseGeocode(result.latitude, result.longitude);
    saveStoredLocation(geo);
    setCustomerLocation(geo);
    window.dispatchEvent(new CustomEvent('fixmate-location-changed', { detail: geo }));
    setLocationMsg({ type: 'success', text: geo.name });
  };

  const openPartnerProfile = async (partner, e) => {
    if (e) e.stopPropagation();
    setProfilePartner(partner);
    setProfileData(null);
    setProfileError('');
    setShowAllReviews(false);
    setProfileLoading(true);
    try {
      const category = categories.find((c) => c.id === Number(selectedCategory));
      const resolved = resolveLocation();
      const params = new URLSearchParams();
      if (category) params.set('categoryName', category.name);
      if (resolved && resolved.location) {
        params.set('latitude', resolved.location.latitude);
        params.set('longitude', resolved.location.longitude);
      }
      const qs = params.toString();
      const { data } = await fetchWithAuth(`/partners/${partner.userId}/profile${qs ? `?${qs}` : ''}`);
      if (data.success) setProfileData(data.data);
      else setProfileError(data.message || 'Unable to load partner profile. Please try again.');
    } catch (err) {
      setProfileError(err.message || 'Unable to load partner profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const closePartnerProfile = () => {
    setProfilePartner(null);
    setProfileData(null);
    setProfileError('');
    setShowAllReviews(false);
  };

  const useMyLocationForAddress = async () => {
    setLocating(true);
    const res = await getBrowserPosition();
    if (res.success) {
      const geo = await reverseGeocode(res.coords.latitude, res.coords.longitude);
      setAddressForm((prev) => ({
        ...prev,
        buildingName: geo.buildingName || prev.buildingName,
        street: geo.street || prev.street,
        city: geo.city || prev.city,
        state: geo.state || prev.state,
        zipCode: geo.zipCode || prev.zipCode,
        country: geo.country || prev.country,
        latitude: String(res.coords.latitude),
        longitude: String(res.coords.longitude)
      }));
    } else {
      setBookingError(res.error);
    }
    setLocating(false);
  };

  const resolveLocation = () => {
    if (confirmedLocation) return { location: confirmedLocation, source: 'confirmed' };
    return null;
  };

  // ── Nearby partners search ──
  const handleFindPartners = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');
    setFoundPartners([]);
    setSearchEmpty(false);
    setSelectedPartner(null);
    setSearchRadius(null);

    const category = categories.find((c) => c.id === Number(selectedCategory));
    if (!category) {
      setBookingError('Please select a service category first.');
      return;
    }
    const resolved = resolveLocation();
    if (!resolved) {
      setBookingError('Please set your location before searching for nearby service partners.');
      return;
    }

    setSearching(true);
    try {
      setLastSearchLocation(resolved.location);
      const { data } = await fetchWithAuth(
        `/search/nearby?categoryId=${category.id}&latitude=${resolved.location.latitude}&longitude=${resolved.location.longitude}`
      );
      if (data.success) {
        setFoundPartners(data.data);
        // Determine the effective radius from the response
        if (data.data.length > 0) {
          const maxDist = Math.max(...data.data.map(p => p.distanceKm || 0));
          setSearchRadius(Math.ceil(maxDist));
        }
        if (data.data.length === 0) {
          setSearchEmpty(true);
          setSearchEmptyMessage(data.message || '');
        } else {
          openLiveStream(category.id, resolved.location);
        }
        setBookingStep(3);
      } else {
        setBookingError(data.message || 'No nearby service partners available.');
      }
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setSearching(false);
    }
  };

  // ── Create booking ──
  const handleCreateBooking = async (partner) => {
    setBookingError('');
    setBookingSuccess('');
    setSavingBooking(true);
    try {
      const isEmergency = bookingType === 'emergency';
      const resolved = resolveLocation();
      if (!resolved) {
        setBookingError('Please set your location before booking a service partner.');
        setSavingBooking(false);
        return;
      }
      const loc = resolved.location;

      const { data } = await fetchWithAuth(isEmergency ? '/bookings/emergency' : '/bookings', {
        method: 'POST',
        body: JSON.stringify(isEmergency
          ? {
              categoryId: Number(selectedCategory),
              addressId: Number(selectedAddress),
              notes,
              customerLatitude: loc.latitude,
              customerLongitude: loc.longitude
            }
          : {
              partnerId: partner ? Number(partner.userId) : Number(selectedPartner.userId),
              categoryId: Number(selectedCategory),
              addressId: Number(selectedAddress),
              scheduledDate,
              notes,
              customerLatitude: loc.latitude,
              customerLongitude: loc.longitude
            })
      });

      if (data.success) {
        const assigned = data.data?.partnerName;
        if (isEmergency) {
          setBookingSuccess(`✅ Emergency booking created\n${assigned} has been notified and is on the way.`);
        } else {
          setBookingSuccess(`✅ Booking created successfully\nYour request has been sent to ${assigned}.`);
        }
        setTimeout(() => {
          setShowModal(false);
          resetBookingModal();
          loadBookings();
        }, 1800);
      } else {
        setBookingError(data.message || 'Failed to create booking');
      }
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setSavingBooking(false);
    }
  };

  const handleEmergencyBooking = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');
    setSearching(true);
    try {
      await handleCreateBooking();
    } finally {
      setSearching(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await fetchWithAuth('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          ...addressForm,
          isDefault: true,
          latitude: addressForm.latitude ? parseFloat(addressForm.latitude) : null,
          longitude: addressForm.longitude ? parseFloat(addressForm.longitude) : null
        })
      });
      if (data.success) {
        const addr = data.data;
        setAddresses((prev) => [...prev, addr]);
        setSelectedAddress(String(addr.id));
        setAddressForm(emptyAddress);
        setShowAddressForm(false);
      } else {
        setBookingError(data.message || 'Failed to add address');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddressDeleted = (id) => {
    setAddresses((prev) => prev.filter(a => String(a.id) !== String(id)));
    if (String(selectedAddress) === String(id)) {
      setSelectedAddress('');
    }
  };

  const handleAddressUpdated = (updatedAddr) => {
    setAddresses((prev) => {
      // If the updated address is set as default, unset others locally
      if (updatedAddr.isDefault) {
        return prev.map(a => 
          String(a.id) === String(updatedAddr.id) 
            ? updatedAddr 
            : { ...a, isDefault: false }
        );
      }
      return prev.map(a => String(a.id) === String(updatedAddr.id) ? updatedAddr : a);
    });
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    setSavingReview(true);
    try {
      const { data } = await fetchWithAuth(`/reviews/booking/${selectedBookingForReview.id}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      });
      if (data.success) {
        setShowReviewModal(false);
        setComment('');
        setRating(5);
        setBookingSuccess('');
        alert('Review submitted successfully!');
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingReview(false);
    }
  };

  const upcomingBookings = bookings.filter((b) => ['PENDING', 'ACCEPTED'].includes(b.status));
  const activeBookings = bookings.filter((b) => ['ON_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');
  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings
    : activeTab === 'active' ? activeBookings
    : activeTab === 'completed' ? completedBookings
    : activeTab === 'cancelled' ? cancelledBookings
    : bookings;

  const filteredCategories = categories.filter((c) =>
    !heroFilter || c.name.toLowerCase().includes(heroFilter.toLowerCase())
  );

  const selectCategoryFromHero = (c) => {
    openBookingModal('scheduled', String(c.id));
  };

  // ── Split partners into online and offline ──
  const onlinePartners = foundPartners.filter((p) => p.active);
  const offlinePartners = foundPartners.filter((p) => !p.active);

  const mobileNavigate = (id) => {
    setMobileNav(id);
    if (id === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (id === 'bookings') bookingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (id === 'book') openBookingModal();
  };

  const goNext = () => {
    setBookingError('');
    if (bookingStep === 0 && !selectedCategory) {
      setBookingError('Please select a service category.');
      return;
    }
    if (bookingStep === 1 && !resolveLocation()) {
      setBookingError('Please set your location before continuing.');
      return;
    }
    if (bookingStep === 2 && bookingType === 'scheduled' && !scheduledDate) {
      setBookingError('Please choose a date and time for your booking.');
      return;
    }
    setBookingStep((s) => Math.min(s + 1, BOOKING_STEPS.length - 1));
  };

  const goBack = () => {
    setBookingError('');
    setBookingStep((s) => Math.max(s - 1, 0));
  };

  const bookingPipelineIndex = (status) => {
    const idx = STATUS_PIPELINE.indexOf(status);
    return idx === -1 ? 0 : idx;
  };

  // ── Enhanced partner card component ──
  const renderPartnerCard = (p, isSelected, onSelect, isOffline = false) => (
    <div
      key={p.userId}
      className={`partner-card ${isSelected ? 'partner-card-selected' : ''} ${isOffline ? 'partner-card-offline' : ''}`}
      onClick={() => onSelect(p)}
    >
      {/* Status indicator dot */}
      <div className={`partner-status-dot ${p.active ? 'partner-status-dot-online' : 'partner-status-dot-offline'}`} />

      <Avatar name={`${p.firstName || ''} ${p.lastName || ''}`} size="lg" />
      <div className="partner-card-info">
        <div className="partner-card-name">
          {p.firstName} {p.lastName}
          {p.kycStatus === 'APPROVED' && (
            <BadgeCheck size={16} className="verified-badge" aria-label="KYC verified" />
          )}
          {p.matchScore != null && p.matchScore > 0 && (
            <span className="match-score-pill" title={p.matchReasons?.join(', ') || ''}>
              {p.matchScore}% Match
            </span>
          )}
          {p.smartServiceScore != null && (
            <span className="rating-pill">
              <Star size={12} /> {Number(p.smartServiceScore).toFixed(1)}
            </span>
          )}
        </div>

        {p.matchReasons && p.matchReasons.length > 0 && (
          <div className="partner-match-reasons">
            {p.matchReasons.slice(0, 3).map((reason, i) => (
              <span key={i} className="match-reason-tag">✓ {reason}</span>
            ))}
          </div>
        )}

        <div className="partner-card-meta">
          <span className="partner-meta-item">
            <MapPin size={12} /> {formatDistance(p.distanceKm)}
          </span>
          {p.hourlyRate != null && (
            <span className="partner-meta-item">
              ₹{p.hourlyRate}/hr
            </span>
          )}
          {p.totalBookings > 0 && (
            <span className="partner-meta-item">
              <Briefcase size={12} /> {p.totalBookings} jobs
            </span>
          )}
          {p.experienceYears ? (
            <span className="partner-meta-item">
              {p.experienceYears}yr{p.experienceYears === 1 ? '' : 's'} exp
            </span>
          ) : null}
        </div>

        <div className="partner-card-badges">
          {p.active ? (
            <span className="status-badge status-online">
              <span className="dot dot-green" /> {p.available ? 'Available Now' : 'Online'}
            </span>
          ) : (
            <span className="status-badge status-offline">
              <span className="dot dot-gray" /> Last active {formatLastActive(p.lastLocationUpdate)}
            </span>
          )}
          {p.emergencyAvailable && <span className="status-badge status-emergency">🚨 Emergency</span>}
          {p.serviceCategory && <span className="status-badge status-pending">{p.serviceCategory}</span>}
          {p.kycStatus === 'APPROVED' && <span className="status-badge status-kyc">KYC ✓</span>}
          {p.totalBookings >= 100 && <span className="status-badge status-kyc">🏆 100+ Jobs</span>}
          {p.smartServiceScore >= 4.5 && <span className="status-badge status-kyc">⭐ Top Rated</span>}
        </div>
      </div>
      <div className="partner-card-actions">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={(e) => openPartnerProfile(p, e)}
        >
          <User size={14} /> View Profile
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={(e) => { e.stopPropagation(); setSelectedPartner(p); setBookingStep(4); }}
        >
          Select <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="container dashboard-container">
      {/* ============ Location bar (sub-header) ============ */}
      {customerLocation && (
        <div className="location-bar glass-panel">
          <div className="location-bar-content">
            <MapPin size={16} className="location-bar-icon" />
            <div className="location-bar-info">
              <span className="location-bar-name">{customerLocation.name}</span>
              {customerLocation.formattedAddress && (
                <span className="location-bar-coords">{customerLocation.formattedAddress}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ Hero ============ */}
      <section className="hero-section">
        <h1 className="hero-title">
          {user?.firstName ? `What do you need help with, ${user.firstName}?` : 'What do you need help with?'}
        </h1>
        <p className="hero-subtitle">
          {customerLocation
            ? `Showing professionals near ${customerLocation.name}`
            : 'Set your location to find verified professionals near you'}
        </p>
        <div className="hero-search-container">
          <SmartSearch
            placeholder="Search for plumbing, mechanic, electrician..."
            onResultSelect={(entry, categoryName) => {
              window.dispatchEvent(new CustomEvent('fixmate-search-select', {
                detail: { entry, categoryName }
              }))
            }}
          />
          <button type="button" className="btn btn-gradient hero-search-btn" onClick={() => openBookingModal('scheduled')}>
            Find Services
          </button>
        </div>
        <div className="hero-chips">
          <button type="button" className="hero-chip" onClick={() => openBookingModal('scheduled')}>📅 Schedule a Service</button>
          <button type="button" className="hero-chip" onClick={() => openBookingModal('emergency')}>🚨 Emergency Help</button>
          <button type="button" className="hero-chip" onClick={() => bookingsRef.current?.scrollIntoView({ behavior: 'smooth' })}>📋 My Bookings</button>
        </div>
      </section>

      {/* ============ Emergency banner ============ */}
      <section className="card card-hover" style={{ marginBottom: '1.5rem', borderColor: '#fecaca', background: 'linear-gradient(90deg, #fef2f2, #fff7f7)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'var(--danger)', color: '#fff' }}>
              <Siren size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--danger-dark)', fontSize: '1.05rem' }}>Need help right now?</div>
              <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                Find the nearest available professional instantly.
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-danger" onClick={() => openBookingModal('emergency')}>
            <Siren size={16} /> Get Emergency Help
          </button>
        </div>
      </section>

      {/* ============ Categories ============ */}
      <section className="dashboard-content glass-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="section-head">
          <div>
            <div className="section-title">Browse Services</div>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              {heroFilter ? `Matching "${heroFilter}"` : 'Choose a category to find nearby professionals'}
            </p>
          </div>
        </div>
        {categories.length === 0 ? (
          <div className="grid-auto-sm">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '110px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="empty-state">
            <p>No categories match "{heroFilter}". Try a different search.</p>
          </div>
        ) : (
          <div className="category-grid">
            {filteredCategories.map((c) => (
              <div key={c.id} className="category-card" onClick={() => selectCategoryFromHero(c)}>
                <div className="category-icon">
                  <ServiceIcon categoryName={c.name} size={24} />
                </div>
                <div className="category-name">{c.name}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ Bookings ============ */}
      <section ref={bookingsRef} className="dashboard-content glass-panel">
        <div className="section-head">
          <div>
            <div className="section-title">My Bookings</div>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              {activeTab === 'active' ? 'Current and upcoming requests' : 'Completed services — leave a review'}
            </p>
          </div>
        </div>

        <div className="tabs">
          {[
            { id: 'upcoming', label: 'Upcoming', count: upcomingBookings.length },
            { id: 'active', label: 'Active', count: activeBookings.length },
            { id: 'completed', label: 'Completed', count: completedBookings.length },
            { id: 'cancelled', label: 'Cancelled', count: cancelledBookings.length }
          ].map((tab) => (
            <button key={tab.id} type="button" className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : displayedBookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Briefcase size={22} /></div>
            <h4>No bookings here yet</h4>
            <p>
              {activeTab === 'active'
                ? 'When you book a service partner, your active requests will appear here.'
                : 'Completed services will appear here with a review option.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => openBookingModal()}>
              <Plus size={16} /> Book a Service
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service</th>
                  <th>Partner</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="font-semibold">#{b.id}</span>
                      {b.emergency && <span className="status-badge status-emergency" style={{ marginLeft: '0.5rem' }}>EMERGENCY</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ServiceIcon categoryName={b.categoryName} size={15} />
                        <span>{b.categoryName || 'Service'}</span>
                      </div>
                    </td>
                    <td>{b.partnerName || '—'}</td>
                    <td>
                      <span className={`status-badge status-${b.status === 'IN_PROGRESS' ? 'in_progress' : b.status.toLowerCase()}`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString() : '—'}</td>
                    <td className="text-secondary">{b.totalAmount != null ? `₹${Number(b.totalAmount).toFixed(2)}` : '—'}</td>
                    <td>
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailsBooking(b)}>
                          Track
                        </button>
                        {activeTab === 'completed' && b.paymentStatus !== 'SUCCESS' && (
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDetailsBooking(b)}>
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============ Mobile bottom nav ============ */}
      <MobileNav
        items={[
          { id: 'home', label: 'Home', icon: MOBILE_NAV_ICONS.Home },
          { id: 'book', label: 'Book', icon: MOBILE_NAV_ICONS.PlusCircle },
          { id: 'bookings', label: 'Bookings', icon: MOBILE_NAV_ICONS.CalendarDays }
        ]}
        active={mobileNav}
        onNavigate={mobileNavigate}
      />

      {/* ============ Booking modal (stepper journey) ============ */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={bookingType === 'emergency' ? '🚨 Emergency Help' : 'Book a Service'}
        subtitle={bookingType === 'emergency'
          ? 'We will find the nearest available partner for you instantly.'
          : 'Find nearby professionals and choose who you want.'}
        size="lg"
      >
        {/* Booking type toggle */}
        <div className="grid grid-2" style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn ${bookingType === 'scheduled' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setBookingType('scheduled'); resetBookingModal(); }}
          >
            <CalendarDays size={16} /> Scheduled
          </button>
          <button
            type="button"
            className={`btn ${bookingType === 'emergency' ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => { setBookingType('emergency'); resetBookingModal(); }}
          >
            <Siren size={16} /> Emergency
          </button>
        </div>

        {bookingType === 'scheduled' && <Stepper steps={BOOKING_STEPS} current={bookingStep} />}

        {bookingError && <div className="alert alert-danger">{bookingError}</div>}
        {bookingSuccess && <div className="alert alert-success">{bookingSuccess}</div>}

        {searching ? (
          <div className="searching-panel">
            <div className="searching-radar">
              <span className="spinner" style={{ width: '1.6rem', height: '1.6rem', borderWidth: '3px' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                {bookingType === 'emergency' ? 'Finding the nearest available partner...' : 'Finding nearby professionals...'}
              </p>
              <p className="text-secondary" style={{ fontSize: '0.8rem' }}>
                Looking for the closest active partners in your area
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 0 — Service */}
            {bookingStep === 0 && (
              <div>
                <div className="form-label">Choose a service</div>
                <div className="category-grid">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className={`category-card ${selectedCategory === String(c.id) ? 'card-selected' : ''}`}
                      onClick={() => setSelectedCategory(String(c.id))}
                    >
                      <div className="category-icon">
                        <ServiceIcon categoryName={c.name} size={22} />
                      </div>
                      <div className="category-name">{c.name}</div>
                    </div>
                  ))}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={goNext}>
                    Continue <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1 - Location */}
            {bookingStep === 1 && (
              <div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  {addresses.length === 0 && !showAddressForm ? (
                    <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      No saved addresses yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {selectedAddress ? (
                        <div className="p-3 border border-primary/30 bg-primary/5 rounded-lg flex justify-between items-center">
                          <div>
                            <span className="font-semibold block text-sm">
                              {addresses.find(a => String(a.id) === String(selectedAddress))?.buildingName ? `${addresses.find(a => String(a.id) === String(selectedAddress))?.buildingName}, ` : ''}{addresses.find(a => String(a.id) === String(selectedAddress))?.street || 'Selected Address'}
                            </span>
                            <span className="text-xs text-base-content/70">
                              {addresses.find(a => String(a.id) === String(selectedAddress))?.city}, {addresses.find(a => String(a.id) === String(selectedAddress))?.state}
                            </span>
                          </div>
                          <CheckCircle2 size={18} className="text-primary" />
                        </div>
                      ) : (
                        <div className="p-3 border border-base-200 bg-base-50 rounded-lg text-sm text-base-content/60 italic">
                          No address selected. Please select one.
                        </div>
                      )}
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowAddressManager(true)}
                      >
                        <MapPin size={14} /> Manage Saved Addresses
                      </button>
                    </div>
                  )}

                  {showAddressForm && (
                    <div className="card" style={{ marginTop: '0.75rem', padding: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Building Name / No</label>
                        <input className="form-input" placeholder="e.g. Sai Prithi Cyber Arcade, Flat 4B" value={addressForm.buildingName} onChange={(e) => setAddressForm({ ...addressForm, buildingName: e.target.value })} />
                      </div>
                      <div className="form-row">
                        <div className="form-group half-width">
                          <label className="form-label">Street</label>
                          <input className="form-input" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} required />
                        </div>
                        <div className="form-group half-width">
                          <label className="form-label">City</label>
                          <input className="form-input" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} required />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group half-width">
                          <label className="form-label">State</label>
                          <input className="form-input" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} required />
                        </div>
                        <div className="form-group half-width">
                          <label className="form-label">ZIP / PIN Code</label>
                          <input className="form-input" value={addressForm.zipCode} onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })} required />
                        </div>
                      </div>
                      <input type="hidden" value={addressForm.latitude} />
                      <input type="hidden" value={addressForm.longitude} />
                      <button type="button" className="btn btn-outline btn-sm btn-block" onClick={useMyLocationForAddress} disabled={locating}>
                        <Navigation size={14} /> {locating ? 'Getting location...' : 'Use my current location'}
                      </button>
                      <div className="form-row" style={{ marginTop: '0.75rem' }}>
                        <div className="form-group half-width">
                          <label className="form-label">Country</label>
                          <input className="form-input" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} required />
                        </div>
                        <div className="form-group half-width" style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <button type="button" className="btn btn-primary btn-block" onClick={handleAddAddress}>
                            Save Address
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setShowAddressForm(!showAddressForm)}>
                    <Plus size={14} /> {showAddressForm ? 'Cancel adding address' : 'Add new address'}
                  </button>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={goBack}><ChevronLeft size={16} /> Back</button>
                  {bookingType === 'emergency' ? (
                    <button type="button" className="btn btn-danger" onClick={handleEmergencyBooking} disabled={savingBooking}>
                      <Siren size={16} /> {savingBooking ? 'Assigning...' : 'Book Emergency Help'}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={goNext}>
                      Continue <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2 — Schedule (scheduled only) */}
            {bookingStep === 2 && bookingType === 'scheduled' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Scheduled Date & Time</label>
                  <input
                    type="datetime-local" className="form-input"
                    value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                  />
                  <p className="form-hint">Choose a convenient slot for the service.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Describe what you need</label>
                  <textarea
                    className="form-input" rows="3"
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., Kitchen sink is leaking and the tap needs replacing..."
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={goBack}><ChevronLeft size={16} /> Back</button>
                  <button type="button" className="btn btn-primary" onClick={handleFindPartners}>
                    <Search size={16} /> Find Nearby Professionals
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Partners (ONLINE / OFFLINE split) */}
            {bookingStep === 3 && bookingType === 'scheduled' && (
              <div>
                <div className="section-head">
                  <div>
                    <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {foundPartners.length === 1 ? '1 professional found' : `${foundPartners.length} professionals found`}
                      {liveStreamActive && <span className="status-badge status-live">🟢 LIVE</span>}
                    </div>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>
                      Sorted by distance from your location{liveStreamActive ? ' · updates automatically' : ''}
                    </p>
                  </div>
                </div>

                {searchEmpty ? (
                  <div className="empty-state">
                    <div className="empty-icon"><MapPin size={22} /></div>
                    <h4>No nearby professionals found</h4>
                    <p>
                      {searchEmptyMessage || 'Partners must be online, marked available, and within range of your location.'}
                    </p>
                    {lastSearchLocation && (
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Searched near {Number(lastSearchLocation.latitude).toFixed(4)}, {Number(lastSearchLocation.longitude).toFixed(4)}
                      </p>
                    )}
                    <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearchEmpty(false); setSearchEmptyMessage(''); setBookingStep(2); }}>
                        ↺ Try a different search
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ONLINE NOW section */}
                    {onlinePartners.length > 0 && (
                      <div className="partner-section">
                        <div className="partner-section-header">
                          <div className="partner-section-label">
                            <span className="dot dot-green" /> ONLINE NOW
                          </div>
                          <span className="partner-section-count">{onlinePartners.length}</span>
                        </div>
                        {onlinePartners.map((p) =>
                          renderPartnerCard(p, selectedPartner?.userId === p.userId, (partner) => setSelectedPartner(partner), false)
                        )}
                      </div>
                    )}

                    {/* OFFLINE section */}
                    {offlinePartners.length > 0 && (
                      <div className="partner-section">
                        <div className="partner-section-header">
                          <div className="partner-section-label">
                            <span className="dot dot-gray" /> OFFLINE
                          </div>
                          <span className="partner-section-count">{offlinePartners.length}</span>
                        </div>
                        {offlinePartners.map((p) =>
                          renderPartnerCard(p, selectedPartner?.userId === p.userId, (partner) => setSelectedPartner(partner), true)
                        )}
                      </div>
                    )}

                    <div className="flex justify-between" style={{ marginTop: '0.75rem' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={goBack}><ChevronLeft size={14} /> Back</button>
                      <button
                        type="button" className="btn btn-outline btn-sm"
                        onClick={() => { closeLiveStream(); setFoundPartners([]); setSelectedPartner(null); setSearchRadius(null); setBookingStep(2); }}
                      >
                        ↺ Search again
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 4 — Confirm */}
            {bookingStep === 4 && bookingType === 'scheduled' && selectedPartner && (
              <div>
                <div className="card" style={{ padding: '1.1rem 1.25rem', marginBottom: '1rem', background: 'var(--surface-muted)' }}>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${selectedPartner.firstName} ${selectedPartner.lastName}`} size="lg" />
                    <div className="flex-1">
                      <div style={{ fontWeight: 700 }}>{selectedPartner.firstName} {selectedPartner.lastName}</div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        <MapPin size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {formatDistance(selectedPartner.distanceKm)} · ₹{selectedPartner.hourlyRate ?? 0}/hr
                      </div>
                    </div>
                    <span className="status-badge status-online"><span className="dot dot-green" /> {selectedPartner.active ? 'ONLINE' : 'OFFLINE'}</span>
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: '0.75rem', marginBottom: '0.5rem' }}>
                  {[
                    { label: 'Service', value: categories.find((c) => c.id === Number(selectedCategory))?.name || '—' },
                    { label: 'Booking Type', value: 'Scheduled' },
                    { label: 'Date & Time', value: scheduledDate ? new Date(scheduledDate).toLocaleString() : '—' },
                    { label: 'Estimated Cost', value: `₹${selectedPartner.hourlyRate ?? 0}/hr` }
                  ].map((row) => (
                    <div key={row.label} className="card" style={{ padding: '0.75rem 1rem' }}>
                      <div className="stat-label">{row.label}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem' }}>{row.value}</div>
                    </div>
                  ))}
                </div>

                {notes && (
                  <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    <strong>Notes:</strong> {notes}
                  </p>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setBookingStep(3)}><ChevronLeft size={16} /> Back</button>
                  <button type="button" className="btn btn-gradient btn-lg" onClick={() => handleCreateBooking(selectedPartner)} disabled={savingBooking}>
                    {savingBooking ? (
                      <><span className="spinner spinner-light" /> Creating Booking...</>
                    ) : (
                      <><CheckCircle2 size={17} /> Confirm & Book</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ============ Partner profile modal ============ */}
      <Modal
        open={!!profilePartner}
        onClose={closePartnerProfile}
        title="Partner Profile"
        subtitle={profileData?.serviceCategory ? `${profileData.serviceCategory} Professional` : 'Service Professional'}
      >
        {profileLoading ? (
          <div className="searching-panel">
            <div className="searching-radar">
              <span className="spinner" style={{ width: '1.4rem', height: '1.4rem', borderWidth: '3px' }} />
            </div>
            <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Loading profile...</p>
          </div>
        ) : profileError ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
              <X size={22} />
            </div>
            <h4>Unable to load partner profile</h4>
            <p>{profileError}</p>
          </div>
        ) : profileData ? (
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: '1.25rem' }}>
              <Avatar name={profileData.name || `${profileData.firstName} ${profileData.lastName}`} size="lg" />
              <div className="flex-1">
                <div style={{ fontWeight: 800, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {profileData.name || `${profileData.firstName} ${profileData.lastName}`}
                  {profileData.kycStatus === 'APPROVED' && (
                    <BadgeCheck size={18} className="verified-badge" aria-label="KYC verified" />
                  )}
                </div>
                <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
                  {profileData.serviceCategory ? `🔧 ${profileData.serviceCategory} Professional` : 'Service Professional'}
                </div>
              </div>
              <div className="text-center" style={{ textAlign: 'right' }}>
                <div className="flex items-center gap-1" style={{ justifyContent: 'flex-end' }}>
                  <RatingStars value={profileData.averageRating ?? 0} />
                  <strong>{profileData.totalReviews > 0 ? Number(profileData.averageRating).toFixed(1) : '—'}</strong>
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {profileData.totalReviews > 0 ? `Based on ${profileData.totalReviews} review${profileData.totalReviews === 1 ? '' : 's'}` : 'Not rated yet'}
                </div>
              </div>
            </div>

            <div className="grid grid-2" style={{ gap: '0.6rem', marginBottom: '1rem' }}>
              {[
                { label: 'Experience', value: profileData.experienceYears != null ? `${profileData.experienceYears} Year${profileData.experienceYears === 1 ? '' : 's'}` : '—', icon: <Briefcase size={15} /> },
                { label: 'Hourly Rate', value: profileData.hourlyRate != null ? `₹${profileData.hourlyRate}/hour` : '—', icon: <Wallet size={15} /> },
                { label: 'Distance from you', value: profileData.distanceKm != null ? `${profileData.distanceKm} km` : '—', icon: <MapPin size={15} /> },
                { label: 'Smart Service Score', value: profileData.smartServiceScore != null ? `${Number(profileData.smartServiceScore).toFixed(1)} / 5.0` : '—', icon: <Star size={15} /> }
              ].map((row) => (
                <div key={row.label} className="card" style={{ padding: '0.7rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ color: 'var(--primary)' }}>{row.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="stat-label">{row.label}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap" style={{ marginBottom: '1.25rem' }}>
              {profileData.kycStatus === 'APPROVED' ? (
                <span className="status-badge status-kyc"><ShieldCheck size={12} /> KYC Verified</span>
              ) : (
                <span className="status-badge status-pending">KYC {profileData.kycStatus || 'PENDING'}</span>
              )}
              {profileData.available && profileData.active ? (
                <span className="status-badge status-online"><span className="dot dot-green" /> Currently Available</span>
              ) : (
                <span className="status-badge status-offline"><span className="dot dot-gray" /> Not Available</span>
              )}
            </div>

            {(profileData.skills?.length > 0) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="form-label">Skills</div>
                <div className="flex gap-2 flex-wrap">
                  {profileData.skills.map((s) => (
                    <span key={s} className="status-badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="divider" />

            <div className="section-head">
              <div>
                <div className="section-title">Reviews</div>
                <p className="text-secondary" style={{ fontSize: '0.8rem' }}>
                  {profileData.totalReviews > 0 ? `Average ${Number(profileData.averageRating).toFixed(1)} across ${profileData.totalReviews} reviews` : 'No reviews yet'}
                </p>
              </div>
            </div>

            {profileData.reviews?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <RatingDistribution
                  counts={[5, 4, 3, 2, 1].map((stars) => ({
                    stars,
                    count: profileData.reviews.filter((r) => r.rating === stars).length
                  }))}
                  total={profileData.reviews.length}
                />
              </div>
            )}

            {profileData.reviews?.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p>No reviews yet — this professional hasn't been reviewed after a completed booking.</p>
              </div>
            ) : (
              <>
                {(showAllReviews ? profileData.reviews : profileData.reviews.slice(0, 3)).map((r) => (
                  <div key={r.id} className="card" style={{ padding: '0.85rem 1rem', marginBottom: '0.6rem' }}>
                    <div className="flex justify-between items-center">
                      <RatingStars value={r.rating} size={14} />
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>{r.customerName || 'Customer'}</span>
                    </div>
                    {r.comment && <p style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--text-primary)' }}>"{r.comment}"</p>}
                  </div>
                ))}
                {profileData.reviews.length > 3 && (
                  <button type="button" className="btn btn-outline btn-sm btn-block" onClick={() => setShowAllReviews(!showAllReviews)}>
                    {showAllReviews ? 'Show fewer reviews' : `View All Reviews (${profileData.reviews.length})`}
                  </button>
                )}
              </>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ============ Review modal ============ */}
      <Modal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Leave a Review"
        subtitle={selectedBookingForReview ? `Booking #${selectedBookingForReview.id} — ${selectedBookingForReview.partnerName || 'Partner'}` : ''}
      >
        <form onSubmit={handleCreateReview}>
          <div className="form-group" style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
            <div className="form-label">How was your service?</div>
            <StarSelector value={rating} onChange={setRating} />
          </div>
          <div className="form-group">
            <label className="form-label">Comments</label>
            <textarea
              className="form-input" rows="3"
              value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="How was the service? What went well?"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowReviewModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingReview}>
              {savingReview ? (<><span className="spinner spinner-light" /> Submitting...</>) : 'Submit Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============ Booking Tracking Modal ============ */}
      {detailsBooking && (
        <BookingTracking
          booking={detailsBooking}
          onClose={() => setDetailsBooking(null)}
          onStatusUpdate={(updated) => {
            setDetailsBooking(updated)
            setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))
          }}
        />
      )}

      {/* ============ Location Modal (for booking flow Change Location) ============ */}
      <LocationModal
        open={bookingLocationModalOpen}
        onClose={() => setBookingLocationModalOpen(false)}
        onSelect={(loc) => {
          if (loc) {
            setCustomerLocation(loc)
            setConfirmedLocation({ latitude: loc.latitude, longitude: loc.longitude })
            setPendingLat(String(loc.latitude))
            setPendingLon(String(loc.longitude))
            saveStoredLocation(loc)
            window.dispatchEvent(new CustomEvent('fixmate-location-changed', { detail: loc }))
          }
          setBookingLocationModalOpen(false)
        }}
        currentLocation={customerLocation}
        addresses={addresses}
        onAddressDeleted={handleAddressDeleted}
      />

      {/* ============ Saved Addresses Modal ============ */}
      {showAddressManager && (
        <SavedAddressesModal 
          addresses={addresses}
          selectedAddressId={selectedAddress}
          onSelect={(id) => setSelectedAddress(id)}
          onClose={() => setShowAddressManager(false)}
          onAddNew={() => setShowAddressForm(true)}
          onAddressDeleted={handleAddressDeleted}
          onAddressUpdated={handleAddressUpdated}
        />
      )}
    </div>
  )
}
