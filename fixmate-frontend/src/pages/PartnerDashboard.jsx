import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell, MapPin, Navigation, Briefcase, CheckCircle2, Clock,
  Siren, LogOut, Power, ClipboardList, ShieldCheck, X
} from 'lucide-react'
import { fetchWithAuth } from '../api'
import { getBrowserPosition, validateLocation } from '../utils/location'
import StatCard from '../components/ui/StatCard'
import PartnerEarningsSection from '../components/PartnerEarningsSection'
import ServiceIcon from '../components/ui/ServiceIcon'
import MobileNav from '../components/ui/MobileNav'
import { MOBILE_NAV_ICONS } from '../components/ui/navIcons'
import { SkeletonList } from '../components/ui/Skeleton'
import './Dashboard.css'

const LOCATION_PUSH_INTERVAL_MS = 30000; // push live location every 30s while online

const JOB_FILTERS = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'ON_WAY', label: 'On Way' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'ALL', label: 'All' }
];

const NOTIFICATION_TYPE_ICONS = {
  BOOKING_CREATED: Briefcase,
  EMERGENCY_REQUEST: Siren,
  BOOKING_ACCEPTED: CheckCircle2,
  BOOKING_CANCELLED: X,
  BOOKING_REMINDER: Clock,
  BOOKING_REJECTED: X
};

export default function PartnerDashboard() {
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('PENDING');
  const [mobileNav, setMobileNav] = useState('dashboard');

  // Profile setup form
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ experienceYears: '', hourlyRate: '', skills: '', kycDocumentRef: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillsFallback, setSkillsFallback] = useState(false);

  // Online / location state
  const [online, setOnline] = useState(false);
  const [available, setAvailable] = useState(false);
  const [liveCoords, setLiveCoords] = useState(null);
  const latestCoords = useRef(null);
  const watchId = useRef(null);
  const pushInterval = useRef(null);

  // Location flow: pending values -> "Set Location" -> backend save.
  const [pendingLat, setPendingLat] = useState('');
  const [pendingLon, setPendingLon] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState(null);

  // Notifications: persisted in MySQL, polled every 8s. Panel is portaled to
  // document.body (fixed) so it always floats above the page content.
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const [highlightBookingId, setHighlightBookingId] = useState(null);
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const jobsRef = useRef(null);

  // Close on outside click; re-anchor on resize; dismiss on scroll.
  useEffect(() => {
    if (!showNotifications) return undefined;
    const onDocMouseDown = (e) => {
      if (bellRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setShowNotifications(false);
    };
    const onScroll = () => setShowNotifications(false);
    const onResize = () => {
      if (bellRef.current) {
        const r = bellRef.current.getBoundingClientRect();
        setPanelPos({ top: r.bottom + 10, right: window.innerWidth - r.right });
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [showNotifications]);

  const toggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      const r = bellRef.current?.getBoundingClientRect();
      if (r) setPanelPos({ top: r.bottom + 10, right: window.innerWidth - r.right });
      loadNotifications();
      loadUnreadCount();
    }
  };

  useEffect(() => {
    loadBookings();
    loadProfile();
    loadCategories();
    loadNotifications();
    loadUnreadCount();
    const poll = setInterval(() => {
      loadUnreadCount();
    }, 8000);
    return () => {
      clearInterval(poll);
      stopLocationUpdates();
    };
  }, []);

  const loadCategories = async () => {
    try {
      const { data } = await fetchWithAuth('/categories');
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setCategories(data.data);
      } else {
        setSkillsFallback(true);
      }
    } catch {
      setSkillsFallback(true);
    }
  };

  const loadProfile = async () => {
    try {
      const { data } = await fetchWithAuth('/partners/profile');
      if (data.success) {
        setProfile(data.data);
        setOnline(data.data.online);
        setAvailable(data.data.available);
        if (data.data.currentLatitude && data.data.currentLongitude) {
          const saved = { latitude: data.data.currentLatitude, longitude: data.data.currentLongitude };
          setLiveCoords(saved);
          setPendingLat(String(data.data.currentLatitude));
          setPendingLon(String(data.data.currentLongitude));
        }
        setSelectedSkills(data.data.skills || []);
      }
    } catch {
      // No profile yet — the setup form handles this.
    }
  };

  const loadBookings = async () => {
    try {
      const { data } = await fetchWithAuth('/bookings/partner');
      if (data.success) {
        setBookings(data.data);
      }
    } catch (err) {
      console.error('Failed to load bookings', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const { data } = await fetchWithAuth('/notifications');
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Failed to load notifications', err.message);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { data } = await fetchWithAuth('/notifications/unread-count');
      if (data.success) {
        setUnreadCount(Number(data.data?.count) || 0);
      }
    } catch {
      // Silent — badge polling must never interrupt the dashboard.
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await fetchWithAuth(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification read', err.message);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetchWithAuth('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read', err.message);
    }
  };

  const viewRequest = async (notification) => {
    if (!notification.read) await markNotificationRead(notification.id);
    setShowNotifications(false);
    if (notification.bookingId) {
      setHighlightBookingId(notification.bookingId);
      setTimeout(() => {
        document.getElementById(`booking-row-${notification.bookingId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
      setTimeout(() => setHighlightBookingId(null), 4000);
    }
  };

  const formatRelativeTime = (iso) => {
    if (!iso) return '';
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  // Group notifications by Today / Yesterday / Earlier
  const groupNotifications = () => {
    const groups = [];
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const todayItems = [];
    const yesterdayItems = [];
    const earlierItems = [];
    notifications.forEach((n) => {
      const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
      if (t >= startOfToday) todayItems.push(n);
      else if (t >= startOfYesterday) yesterdayItems.push(n);
      else earlierItems.push(n);
    });
    if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (earlierItems.length) groups.push({ label: 'Earlier', items: earlierItems });
    return groups;
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setStatusMsg('');
    try {
      const skills = selectedSkills.length > 0
        ? selectedSkills
        : profileForm.skills.split(',').map((s) => s.trim()).filter(Boolean);
      const { data } = await fetchWithAuth('/partners/profile', {
        method: 'POST',
        body: JSON.stringify({
          experienceYears: Number(profileForm.experienceYears),
          hourlyRate: Number(profileForm.hourlyRate),
          skills,
          isAvailable: false
        })
      });
      if (data.success) {
        if (profileForm.kycDocumentRef.trim()) {
          await fetchWithAuth('/partners/kyc', {
            method: 'POST',
            body: JSON.stringify({ kycDocumentRef: profileForm.kycDocumentRef.trim() })
          });
        }
        setProfile(data.data);
        setShowProfileForm(false);
        setStatusMsg('Profile saved! KYC submitted for review. You can go online once KYC is approved.');
        loadProfile();
      } else {
        setStatusMsg(data.message || 'Failed to save profile');
      }
    } catch (err) {
      setStatusMsg(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const pushLocation = async (coords, isOnline, isAvailable) => {
    try {
      const { data } = await fetchWithAuth('/partners/location', {
        method: 'POST',
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          isOnline,
          isAvailable
        })
      });
      if (data.success) {
        setProfile(data.data);
        setOnline(data.data.online);
        setAvailable(data.data.available);
        return true;
      }
      setStatusMsg(data.message || 'Failed to update location');
      return false;
    } catch (err) {
      setStatusMsg(err.message);
      return false;
    }
  };

  const stopLocationUpdates = () => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (pushInterval.current) {
      clearInterval(pushInterval.current);
      pushInterval.current = null;
    }
  };

  const useMyCurrentLocation = async () => {
    setLocating(true);
    setLocationMsg(null);
    const res = await getBrowserPosition();
    setLocating(false);
    if (res.success) {
      setPendingLat(res.coords.latitude.toFixed(6));
      setPendingLon(res.coords.longitude.toFixed(6));
      setLocationMsg({
        type: 'info',
        text: `Coordinates found: ${res.coords.latitude.toFixed(6)}, ${res.coords.longitude.toFixed(6)} — click "Set Location" to save.`
      });
    } else {
      setLocationMsg({ type: 'error', text: res.error });
    }
  };

  const handleSetLocation = async () => {
    setLocationMsg(null);
    const result = validateLocation(pendingLat, pendingLon);
    if (result.error) {
      setLocationMsg({ type: 'error', text: result.error });
      return;
    }
    const pos = { latitude: result.latitude, longitude: result.longitude };
    latestCoords.current = pos;
    setLiveCoords(pos);
    setPendingLat(String(result.latitude));
    setPendingLon(String(result.longitude));
    const saved = await pushLocation(pos, online, available);
    if (saved) {
      setStatusMsg('');
      setLocationMsg({
        type: 'success',
        text: `Location set successfully\n📍 ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`
      });
    }
  };

  const goOnline = async () => {
    setStatusMsg('');
    if (!profile) {
      setStatusMsg('Create your partner profile first.');
      return;
    }
    const pos = liveCoords || (profile.currentLatitude ? { latitude: profile.currentLatitude, longitude: profile.currentLongitude } : null);
    if (!pos) {
      setStatusMsg('Set your location before going online.');
      return;
    }
    latestCoords.current = pos;
    setLiveCoords(pos);

    await pushLocation(pos, true, true);

    pushInterval.current = setInterval(() => {
      if (latestCoords.current) {
        pushLocation(latestCoords.current, true, true);
      }
    }, LOCATION_PUSH_INTERVAL_MS);

    setStatusMsg('You are now ONLINE. Nearby customers can find you at your saved location.');
  };

  const goOffline = async () => {
    stopLocationUpdates();
    if (liveCoords || (profile?.currentLatitude)) {
      await pushLocation(
        liveCoords || { latitude: profile.currentLatitude, longitude: profile.currentLongitude },
        false,
        false
      );
    }
    setOnline(false);
    setAvailable(false);
    setStatusMsg('You are now OFFLINE. You will not appear in nearby searches.');
  };

  const toggleProfileForm = () => {
    if (!showProfileForm && profile) {
      setProfileForm({
        experienceYears: String(profile.experienceYears ?? ''),
        hourlyRate: String(profile.hourlyRate ?? ''),
        skills: (profile.skills || []).join(', '),
        kycDocumentRef: profile.kycDocumentRef || ''
      });
      setSelectedSkills(profile.skills || []);
    }
    setShowProfileForm(!showProfileForm);
  };

  const toggleSkill = (skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const updateStatus = async (bookingId, newStatus) => {
    try {
      const { data } = await fetchWithAuth(`/bookings/${bookingId}/status?status=${newStatus}`, {
        method: 'PATCH'
      });
      if (data.success) {
        loadBookings();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const kycApproved = profile?.kycStatus === 'APPROVED';
  const pendingJobs = bookings.filter((b) => b.status === 'PENDING');
  const inProgressJobs = bookings.filter((b) => b.status === 'IN_PROGRESS');
  const completedJobs = bookings.filter((b) => b.status === 'COMPLETED');
  const filteredJobs = jobFilter === 'ALL' ? bookings : bookings.filter((b) => b.status === jobFilter);

  const mobileNavigate = (id) => {
    setMobileNav(id);
    if (id === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (id === 'requests') {
      jobsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (id === 'notifications') {
      toggleNotifications();
    }
  };

  const renderJobAction = (b) => {
    if (b.status === 'PENDING') {
      return (
        <div className="flex gap-2">
          <button onClick={() => updateStatus(b.id, 'ACCEPTED')} className="btn btn-primary btn-sm">
            Accept
          </button>
          <button onClick={() => updateStatus(b.id, 'CANCELLED')} className="btn btn-danger-outline btn-sm">
            Reject
          </button>
        </div>
      );
    }
    if (b.status === 'ACCEPTED') {
      return (
        <div className="flex gap-2">
          <button onClick={() => updateStatus(b.id, 'ON_WAY')} className="btn btn-info btn-sm" style={{ background: 'var(--info)', color: '#fff' }}>
            On My Way
          </button>
        </div>
      );
    }
    if (b.status === 'ON_WAY') {
      return (
        <button onClick={() => updateStatus(b.id, 'ARRIVED')} className="btn btn-accent btn-sm">
          Arrived
        </button>
      );
    }
    if (b.status === 'ARRIVED' || b.status === 'ACCEPTED') {
      return (
        <button onClick={() => updateStatus(b.id, 'IN_PROGRESS')} className="btn btn-outline btn-sm">
          Start Service
        </button>
      );
    }
    if (b.status === 'IN_PROGRESS') {
      return (
        <button onClick={() => updateStatus(b.id, 'COMPLETED')} className="btn btn-success btn-sm">
          Complete
        </button>
      );
    }
    return null;
  };

  return (
    <div className="container dashboard-container">
      {/* ============ Header ============ */}
      <div className="page-header glass-panel">
        <div>
          <h2>Welcome, {user?.firstName || user?.email || 'Partner'}</h2>
          <p className="subtitle">Service Partner Dashboard</p>
        </div>
        <div className="page-header-actions">
          <div style={{ position: 'relative' }}>
            <button
              ref={bellRef}
              type="button"
              className="btn btn-secondary"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              style={{ position: 'relative', padding: '0.5rem 0.7rem' }}
              onClick={toggleNotifications}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    borderRadius: '999px',
                    minWidth: '1.15rem',
                    height: '1.15rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    animation: 'popIn 0.25s ease'
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
          <div style={{ textAlign: 'right', paddingRight: '0.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Smart Service Score
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              ⭐ {profile ? (profile.smartServiceScore ?? 0).toFixed(1) : 'New'}
            </div>
          </div>
        </div>
      </div>

      {/* ============ Stat cards ============ */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          icon={<Power size={19} />}
          label="Status"
          value={online ? 'ONLINE' : 'OFFLINE'}
          sub={available ? 'accepting requests' : 'currently offline'}
          color={online ? 'var(--success)' : 'var(--text-muted)'}
          bg={online ? 'var(--success-light)' : '#f1f5f9'}
        />
        <StatCard
          icon={<Briefcase size={19} />}
          label="Pending Requests"
          value={pendingJobs.length}
          sub="awaiting your action"
          color="var(--warning)"
          bg="var(--warning-light)"
        />
        <StatCard
          icon={<Siren size={19} />}
          label="In Progress"
          value={inProgressJobs.length}
          sub="jobs you are working on"
          color="var(--info)"
          bg="var(--info-light)"
        />
        <StatCard
          icon={<CheckCircle2 size={19} />}
          label="Completed Jobs"
          value={completedJobs.length}
          sub="all-time completions"
          color="var(--success)"
          bg="var(--success-light)"
        />
      </div>

      {/* ============ Earnings Summary ============ */}
      <PartnerEarningsSection />

      {/* ============ Availability & location ============ */}
      <div className="dashboard-content glass-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Availability</h3>
            <div className="flex gap-2 items-center flex-wrap">
              <span className={`status-badge ${online ? 'status-online' : 'status-offline'}`}>
                <span className={`dot ${online ? 'dot-green' : 'dot-gray'}`} /> {online ? 'ONLINE' : 'OFFLINE'}
              </span>
              <span className={`status-badge ${available ? 'status-online' : 'status-pending'}`}>
                {available ? 'AVAILABLE' : 'UNAVAILABLE'}
              </span>
              {liveCoords && (
                <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                  <MapPin size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {liveCoords.latitude.toFixed(5)}, {liveCoords.longitude.toFixed(5)}
                  {profile?.lastLocationUpdate && ` · updated ${new Date(profile.lastLocationUpdate).toLocaleTimeString()}`}
                </span>
              )}
            </div>
            {!kycApproved && profile && (
              <p className="form-hint" style={{ marginTop: '0.5rem', color: 'var(--warning-dark)' }}>
                <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> KYC status: {profile.kycStatus || 'PENDING'} — you can go online only after KYC approval.
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {!online ? (
              <button className="btn btn-success btn-lg" onClick={goOnline}>
                <Power size={17} /> Go Online
              </button>
            ) : (
              <button className="btn btn-outline" onClick={goOffline}>
                <LogOut size={16} /> Go Offline
              </button>
            )}
            <button className="btn btn-secondary" onClick={toggleProfileForm}>
              {showProfileForm ? 'Hide Profile Setup' : (profile ? 'Edit Profile' : 'Setup Profile')}
            </button>
          </div>
        </div>

        {/* Current location: pending coords -> confirmed with "Set Location" */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '0.6rem' }}>
            <div className="form-label" style={{ marginBottom: 0 }}>Current Location</div>
            {liveCoords && (
              <span className="status-badge status-kyc">
                <MapPin size={12} /> {liveCoords.latitude.toFixed(4)}, {liveCoords.longitude.toFixed(4)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '0.75rem' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={useMyCurrentLocation} disabled={locating}>
              <Navigation size={14} /> {locating ? 'Getting location...' : 'Use my current location'}
            </button>
          </div>
          <div className="form-row">
            <div className="form-group half-width">
              <label className="form-label">Latitude</label>
              <input type="number" step="any" className="form-input" value={pendingLat} onChange={(e) => setPendingLat(e.target.value)} placeholder="e.g. 17.4500" />
            </div>
            <div className="form-group half-width">
              <label className="form-label">Longitude</label>
              <input type="number" step="any" className="form-input" value={pendingLon} onChange={(e) => setPendingLon(e.target.value)} placeholder="e.g. 78.3900" />
            </div>
          </div>
          {locationMsg && (
            <div
              style={{
                marginTop: '0.25rem',
                fontSize: '0.8rem',
                whiteSpace: 'pre-line',
                color: locationMsg.type === 'error' ? 'var(--danger)' : locationMsg.type === 'success' ? 'var(--success-dark)' : 'var(--text-secondary)'
              }}
            >
              {locationMsg.text}
            </div>
          )}
          <button type="button" className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={handleSetLocation}>
            <MapPin size={15} /> Set Location
          </button>
          <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Your location is saved to your account only after you click "Set Location". Customers find you by the confirmed coordinates, updated live while you're online.
          </p>
        </div>

        {statusMsg && <p className="text-secondary" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>{statusMsg}</p>}

        {!profile && !showProfileForm && (
          <p className="text-secondary" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            Complete your partner profile to start receiving nearby job requests.
          </p>
        )}

        {showProfileForm && (
          <form onSubmit={saveProfile} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <div className="form-row">
              <div className="form-group half-width">
                <label className="form-label">Experience (years)</label>
                <input type="number" min="0" className="form-input" value={profileForm.experienceYears} onChange={(e) => setProfileForm({ ...profileForm, experienceYears: e.target.value })} placeholder="e.g. 5" required />
              </div>
              <div className="form-group half-width">
                <label className="form-label">Hourly Rate (₹)</label>
                <input type="number" min="0" className="form-input" value={profileForm.hourlyRate} onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: e.target.value })} placeholder="e.g. 350" required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Skills (choose the services you offer)</label>
              {!skillsFallback ? (
                <div className="grid-auto-sm">
                  {categories.map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(c.name)}
                        onChange={() => toggleSkill(c.name)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              ) : (
                <input className="form-input" value={profileForm.skills} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })} placeholder="e.g. Electrical, AC & HVAC" required />
              )}
              <p className="form-hint">
                Customers find you by these skills, so they must match FixMate's service categories exactly.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">KYC Document Reference (e.g. Aadhaar number)</label>
              <input className="form-input" value={profileForm.kycDocumentRef} onChange={(e) => setProfileForm({ ...profileForm, kycDocumentRef: e.target.value })} placeholder="Submit a document ref for KYC approval" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <span className="spinner spinner-light" /> Saving...
                </>
              ) : (
                'Save Profile & Submit KYC'
              )}
            </button>
          </form>
        )}
      </div>

      {/* ============ Jobs ============ */}
      <div ref={jobsRef} className="dashboard-content glass-panel">
        <div className="section-head">
          <div>
            <div className="section-title">My Jobs</div>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              {jobFilter === 'PENDING' ? 'New requests from customers — accept to get started.' : 'Filter your assigned jobs by status.'}
            </p>
          </div>
        </div>

        <div className="tabs">
          {JOB_FILTERS.map((f) => (
            <button key={f.id} type="button" className={`tab-btn ${jobFilter === f.id ? 'tab-btn-active' : ''}`} onClick={() => setJobFilter(f.id)}>
              {f.label}
              {f.id !== 'ALL' && <span className="tab-count">{bookings.filter((b) => b.status === f.id).length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList count={3} />
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><ClipboardList size={22} /></div>
            <h4>No {jobFilter === 'ALL' ? '' : `${jobFilter.toLowerCase().replace('_', ' ')} `}jobs</h4>
            <p>
              {jobFilter === 'PENDING'
                ? 'When a customer books you, the request will appear here immediately.'
                : 'No jobs match this filter.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((b) => (
                  <tr
                    key={b.id}
                    id={`booking-row-${b.id}`}
                    className={highlightBookingId === b.id ? 'row-highlight' : undefined}
                  >
                    <td>
                      <span className="font-semibold">#{b.id}</span>
                      {b.emergency && <span className="status-badge status-emergency" style={{ marginLeft: '0.5rem' }}>EMERGENCY</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <ServiceIcon categoryName={b.categoryName} size={15} />
                        <span>{b.categoryName || 'Service'}</span>
                      </div>
                      {b.notes && <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{b.notes}</div>}
                    </td>
                    <td>{b.customerName || '—'}</td>
                    <td>
                      <span className={`status-badge status-${b.status.toLowerCase()}`}>
                        {b.status === 'IN_PROGRESS' ? 'IN PROGRESS' : b.status}
                      </span>
                    </td>
                    <td>{b.scheduledDate ? new Date(b.scheduledDate).toLocaleString() : '—'}</td>
                    <td>{renderJobAction(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ Mobile bottom nav ============ */}
      <MobileNav
        items={[
          { id: 'dashboard', label: 'Dashboard', icon: MOBILE_NAV_ICONS.LayoutDashboard },
          { id: 'requests', label: 'Requests', icon: MOBILE_NAV_ICONS.ClipboardList },
          { id: 'notifications', label: 'Alerts', icon: MOBILE_NAV_ICONS.Bell }
        ]}
        active={mobileNav}
        onNavigate={mobileNavigate}
      />

      {/* ============ Notification drawer (portaled) ============ */}
      {showNotifications && panelPos && createPortal(
        <div
          ref={panelRef}
          className="notification-panel"
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'fixed',
            top: panelPos.top,
            right: panelPos.right,
            width: '400px',
            maxWidth: 'calc(100vw - 1.5rem)',
            maxHeight: 'min(520px, calc(100vh - 140px))',
            overflowY: 'auto',
            zIndex: 1000,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
            padding: '0.5rem',
            animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div className="flex justify-between items-center" style={{ padding: '0.6rem 0.8rem 0.7rem', borderBottom: '1px solid #eef0f4' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={16} style={{ color: 'var(--primary)' }} /> Notifications
              {unreadCount > 0 && (
                <span style={{ fontSize: '0.7rem', backgroundColor: '#dc2626', color: '#fff', borderRadius: '999px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>
                  {unreadCount} new
                </span>
              )}
            </strong>
            {unreadCount > 0 && (
              <button type="button" className="btn btn-outline btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }} onClick={markAllNotificationsRead}>
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-icon"><Bell size={20} /></div>
              <p>No notifications yet</p>
            </div>
          ) : (
            groupNotifications().map((group) => (
              <div key={group.label}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', padding: '0.9rem 0.8rem 0.3rem' }}>
                  {group.label}
                </div>
                {group.items.map((n) => {
                  const TypeIcon = NOTIFICATION_TYPE_ICONS[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '12px',
                        margin: '0.35rem 0.3rem',
                        border: '1px solid ' + (n.read ? '#eef0f4' : '#c7d2fe'),
                        backgroundColor: n.read ? '#fafbfc' : '#eef2ff',
                        borderLeft: '4px solid ' + (n.read ? 'transparent' : '#6366f1'),
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            width: '1.5rem', height: '1.5rem', borderRadius: '8px', flexShrink: 0,
                            background: n.type === 'EMERGENCY_REQUEST' ? 'var(--danger-light)' : 'var(--primary-soft)',
                            color: n.type === 'EMERGENCY_REQUEST' ? 'var(--danger)' : 'var(--primary)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <TypeIcon size={13} />
                        </span>
                        {n.title || 'Notification'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', marginTop: '0.25rem', marginLeft: '1.9rem' }}>
                        {n.message}
                      </div>
                      {n.bookingId && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', marginLeft: '1.9rem' }}>
                          Booking ID: #{n.bookingId}
                        </div>
                      )}
                      <div className="flex justify-between items-center" style={{ marginTop: '0.4rem', marginLeft: '1.9rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatRelativeTime(n.createdAt)}</span>
                        {n.bookingId ? (
                          <button type="button" className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }} onClick={() => viewRequest(n)}>
                            View Request
                          </button>
                        ) : !n.read ? (
                          <button type="button" className="btn btn-outline btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }} onClick={() => markNotificationRead(n.id)}>
                            Mark as read
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
