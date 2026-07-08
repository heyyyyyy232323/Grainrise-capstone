import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [user, setUser] = useState(null); // {username, role, token}
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Auth Form State
  const [username, setUsername] = useState('farmer');
  const [password, setPassword] = useState('farmer123');
  const [email, setEmail] = useState('');
  
  // New Silo Form State
  const [newSiloName, setNewSiloName] = useState('');
  const [newSiloType, setNewSiloType] = useState('Rice');
  const [newSiloCapacity, setNewSiloCapacity] = useState(1000);
  const [newSiloStock, setNewSiloStock] = useState(500);

  // Silos State
  const [silos, setSilos] = useState([
    { id: 1, name: 'Silo Alpha', grain_type: 'Rice', capacity: 1000.0, current_stock: 780.0, temperature: 24.5, humidity: 55.2, moisture: 13.1 },
    { id: 2, name: 'Silo Beta', grain_type: 'Wheat', capacity: 1500.0, current_stock: 120.0, temperature: 26.0, humidity: 58.0, moisture: 14.5 },
    { id: 3, name: 'Silo Gamma', grain_type: 'Corn', capacity: 800.0, current_stock: 750.0, temperature: 31.2, humidity: 68.5, moisture: 17.2 },
    { id: 4, name: 'Silo Delta', grain_type: 'Rice', capacity: 1200.0, current_stock: 950.0, temperature: 22.1, humidity: 50.0, moisture: 12.2 }
  ]);

  // Alerts State
  const [alerts, setAlerts] = useState([
    { id: 1, silo_id: 3, alert_type: 'Critical Humidity', message: 'Silo Gamma humidity is 68.5% (exceeds safe threshold of 60%). Risk of spoilage!', is_resolved: false },
    { id: 2, silo_id: 3, alert_type: 'Critical Temperature', message: 'Silo Gamma temperature is 31.2°C. Elevated temperature detected.', is_resolved: false }
  ]);

  const [toast, setToast] = useState(null);

  const triggerToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check API status periodically
  const pingApi = async () => {
    try {
      const res = await fetch(`${API_BASE}/`);
      if (res.ok) {
        setIsApiConnected(true);
        fetchData();
      } else {
        setIsApiConnected(false);
      }
    } catch (e) {
      setIsApiConnected(false);
    }
  };

  const fetchData = async () => {
    try {
      const silosRes = await fetch(`${API_BASE}/api/silos`);
      if (silosRes.ok) {
        const silosData = await silosRes.json();
        setSilos(silosData);
      }
      const alertsRes = await fetch(`${API_BASE}/api/alerts`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (err) {
      console.warn("Falling back to local state simulation.", err);
    }
  };

  useEffect(() => {
    pingApi();
    const interval = setInterval(pingApi, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle simulations
  const handleSensorChange = async (siloId, field, value) => {
    const updatedSilos = silos.map(s => {
      if (s.id === siloId) {
        const newSilo = { ...s, [field]: parseFloat(value) };
        // Check thresholds if in mock mode
        if (!isApiConnected) {
          triggerMockAlerts(newSilo);
        }
        return newSilo;
      }
      return s;
    });
    setSilos(updatedSilos);

    if (isApiConnected) {
      try {
        const targetSilo = updatedSilos.find(s => s.id === siloId);
        await fetch(`${API_BASE}/api/silos/${siloId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: parseFloat(value) })
        });
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const triggerMockAlerts = (silo) => {
    if (silo.humidity > 60) {
      const exists = alerts.some(a => a.silo_id === silo.id && a.alert_type === 'Critical Humidity' && !a.is_resolved);
      if (!exists) {
        const newAlert = {
          id: Date.now(),
          silo_id: silo.id,
          alert_type: 'Critical Humidity',
          message: `${silo.name} humidity is ${silo.humidity}%. Spoilage risk detected!`,
          is_resolved: false
        };
        setAlerts(prev => [newAlert, ...prev]);
        triggerToast(`Warning alert triggered for ${silo.name}!`, 'warn');
      }
    }
    if (silo.temperature > 30) {
      const exists = alerts.some(a => a.silo_id === silo.id && a.alert_type === 'Critical Temperature' && !a.is_resolved);
      if (!exists) {
        const newAlert = {
          id: Date.now() + 1,
          silo_id: silo.id,
          alert_type: 'Critical Temperature',
          message: `${silo.name} temperature is ${silo.temperature}°C. Dangerously high!`,
          is_resolved: false
        };
        setAlerts(prev => [newAlert, ...prev]);
        triggerToast(`Critical heat alert triggered for ${silo.name}!`, 'danger');
      }
    }
  };

  // Handle user authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    if (isApiConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, email: email || 'user@grainrise.com', role: 'farmer' })
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ username, role: username === 'admin' ? 'admin' : 'farmer', token: data.access_token });
          triggerToast(`Welcome back, ${username}!`);
          setActiveTab('silos');
        } else {
          const errData = await res.json();
          triggerToast(errData.detail || "Authentication Failed", 'danger');
        }
      } catch (err) {
        triggerToast("Failed to reach Auth API", 'danger');
      }
    } else {
      // Mock Login
      if (password.length >= 4) {
        setUser({ username, role: username === 'admin' ? 'admin' : 'farmer', token: 'mock-jwt-token' });
        triggerToast(`Mock Login Successful: Welcome ${username}`);
        setActiveTab('silos');
      } else {
        triggerToast("Password must be at least 4 characters", 'danger');
      }
    }
  };

  // Add Silo
  const handleAddSilo = async (e) => {
    e.preventDefault();
    const payload = {
      name: newSiloName || `Silo ${silos.length + 1}`,
      grain_type: newSiloType,
      capacity: parseFloat(newSiloCapacity),
      current_stock: parseFloat(newSiloStock),
      temperature: 24.0,
      humidity: 50.0,
      moisture: 12.0
    };

    if (isApiConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/silos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          triggerToast("Successfully added new silo!");
          fetchData();
        }
      } catch (err) {
        triggerToast("Failed to create Silo on server", 'danger');
      }
    } else {
      const newS = { ...payload, id: Date.now() };
      setSilos(prev => [...prev, newS]);
      triggerToast("Silo added to mock dashboard.");
    }
    setNewSiloName('');
    setNewSiloStock(500);
  };

  // Resolve alert
  const handleResolveAlert = async (alertId) => {
    if (isApiConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
          method: 'PUT'
        });
        if (res.ok) {
          triggerToast("Alert marked resolved");
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
      triggerToast("Alert resolved locally.");
    }
  };

  const getSiloAlertCount = (siloId) => {
    return alerts.filter(a => a.silo_id === siloId && !a.is_resolved).length;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 1000,
          padding: '12px 24px', borderRadius: '8px', fontWeight: '600',
          backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
          background: toast.type === 'danger' ? 'rgba(239, 68, 68, 0.9)' :
                     toast.type === 'warn' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(16, 185, 129, 0.9)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', color: '#fff',
          animation: 'float 0.3s ease-out'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="glass" style={{ margin: '16px', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-emerald))',
            width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16,185,129,0.3)'
          }}>
            <span style={{ fontSize: '24px' }}>🌾</span>
          </div>
          <div>
            <span style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
              Grain<span style={{ color: 'var(--accent-emerald)' }}>Rise</span>
            </span>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-4px' }}>Capstone Project</div>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setActiveTab('home')} style={btnStyle(activeTab === 'home')}>Home</button>
          <button onClick={() => setActiveTab('silos')} style={btnStyle(activeTab === 'silos')}>Silos Dashboard</button>
          <button onClick={() => setActiveTab('inventory')} style={btnStyle(activeTab === 'inventory')}>Inventory</button>
          <button onClick={() => setActiveTab('alerts')} style={btnStyle(activeTab === 'alerts')}>
            Alerts 
            {alerts.filter(a => !a.is_resolved).length > 0 && (
              <span style={{ marginLeft: '6px', background: 'var(--accent-red)', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', color: '#fff' }}>
                {alerts.filter(a => !a.is_resolved).length}
              </span>
            )}
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Connection Status indicator */}
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px' }}>
            <span className={`glow-indicator ${isApiConnected ? '' : 'warning'}`}></span>
            <span>{isApiConnected ? 'API Connected' : 'Presentation Mode'}</span>
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{user.username}</div>
                <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', textTransform: 'capitalize' }}>{user.role}</div>
              </div>
              <button onClick={() => { setUser(null); triggerToast("Logged out"); }} style={subBtnStyle}>Log Out</button>
            </div>
          ) : (
            <button onClick={() => setActiveTab('auth')} style={mainBtnStyle}>Sign In</button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '16px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        
        {/* HOME / LANDING TAB */}
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', padding: '20px 0' }}>
            
            {/* Hero Section */}
            <div className="glass animate-float" style={{ padding: '64px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-amber))' }}></div>
              <h1 style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-1px', marginBottom: '16px', lineHeight: '1.1' }}>
                Predictive Grain Silo Analytics & Quality Control
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '700px', margin: '0 auto 32px' }}>
                Protect harvest yields with real-time temperature, moisture, and humidity sensing. Prevent spoilage and secure grain quality through smart automated alerts.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button onClick={() => setActiveTab('silos')} style={mainBtnStyle}>Go to Dashboard</button>
                <button onClick={() => setActiveTab('auth')} style={subBtnStyle}>Access Account</button>
              </div>
            </div>

            {/* Metrics cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="glass" style={{ padding: '24px' }}>
                <div style={{ fontSize: '32px' }}>🌾</div>
                <h3 style={{ fontSize: '20px', marginTop: '12px', marginBottom: '8px' }}>Active Storage</h3>
                <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-amber)' }}>
                  {silos.reduce((acc, curr) => acc + curr.current_stock, 0).toLocaleString()} MT
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Total capacity: {silos.reduce((acc, curr) => acc + curr.capacity, 0).toLocaleString()} MT</div>
              </div>

              <div className="glass" style={{ padding: '24px' }}>
                <div style={{ fontSize: '32px' }}>🌡️</div>
                <h3 style={{ fontSize: '20px', marginTop: '12px', marginBottom: '8px' }}>Average Temp</h3>
                <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                  {(silos.reduce((acc, curr) => acc + curr.temperature, 0) / silos.length).toFixed(1)}°C
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Standard target temperature: Under 25°C</div>
              </div>

              <div className="glass" style={{ padding: '24px' }}>
                <div style={{ fontSize: '32px' }}>⚡</div>
                <h3 style={{ fontSize: '20px', marginTop: '12px', marginBottom: '8px' }}>Active Alarms</h3>
                <div style={{ fontSize: '36px', fontWeight: '800', color: alerts.filter(a => !a.is_resolved).length > 0 ? 'var(--accent-red)' : 'var(--accent-emerald)' }}>
                  {alerts.filter(a => !a.is_resolved).length}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Warnings requiring immediate review</div>
              </div>
            </div>

            {/* Feature details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px', marginTop: '16px' }}>
              <div className="glass" style={{ padding: '32px' }}>
                <h2 style={{ fontSize: '28px', marginBottom: '16px', color: 'var(--accent-emerald)' }}>Capstone Technology Highlights</h2>
                <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <li><strong>FastAPI Async Engine:</strong> High speed endpoints utilizing SQLModel for relational Postgres handling.</li>
                  <li><strong>Sensors Data Simulation:</strong> Dynamically adjust hardware metrics in real-time to trigger threshold alarms.</li>
                  <li><strong>Cross-Platform Parity:</strong> Unified styling variables shared between modern web dashboards and active React Native/Expo devices.</li>
                </ul>
              </div>

              <div className="glass" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Need the Mobile Client?</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '14px', marginBottom: '20px' }}>
                  Open your Expo Go application and point it to the QR code when serving the Expo CLI in the mobile directory.
                </p>
                <div style={{ border: '2px dashed var(--card-border-glow)', padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '48px' }}>📱</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-emerald)', marginTop: '8px' }}>mobile-app CLI Running Ready</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* SILO DASHBOARD TAB */}
        {activeTab === 'silos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '32px' }}>Silos Control Panel</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Real-time sensor feeds. Slide to change metrics and test alert conditions.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {silos.map(s => {
                const fillPercent = ((s.current_stock / s.capacity) * 100).toFixed(0);
                const siloAlerts = getSiloAlertCount(s.id);
                
                return (
                  <div key={s.id} className="glass" style={{ padding: '24px', position: 'relative' }}>
                    
                    {/* Alert Badge */}
                    {siloAlerts > 0 && (
                      <span style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'var(--accent-red)', padding: '4px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 'bold'
                      }}>
                        🚨 {siloAlerts} ALERT
                      </span>
                    )}

                    <h3 style={{ fontSize: '22px', marginBottom: '4px' }}>{s.name}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--accent-emerald)', fontWeight: 'bold', marginBottom: '16px' }}>{s.grain_type} Storage</div>

                    {/* Stock level bar */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span>Capacity ({fillPercent}%)</span>
                        <span style={{ fontWeight: '600' }}>{s.current_stock} / {s.capacity} MT</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${fillPercent}%`,
                          background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-amber))',
                          borderRadius: '4px'
                        }}></div>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />

                    {/* Sensor details & Sliders */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      {/* Temp Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span>Temperature</span>
                          <span style={{ fontWeight: '600', color: s.temperature > 30 ? 'var(--accent-red)' : '' }}>{s.temperature}°C</span>
                        </div>
                        <input
                          type="range" min="15" max="40" step="0.1" value={s.temperature}
                          onChange={(e) => handleSensorChange(s.id, 'temperature', e.target.value)}
                          style={{ width: '100%', accentColor: 'var(--accent-emerald)' }}
                        />
                      </div>

                      {/* Humidity Slider */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span>Humidity</span>
                          <span style={{ fontWeight: '600', color: s.humidity > 60 ? 'var(--accent-red)' : '' }}>{s.humidity}%</span>
                        </div>
                        <input
                          type="range" min="30" max="90" step="0.5" value={s.humidity}
                          onChange={(e) => handleSensorChange(s.id, 'humidity', e.target.value)}
                          style={{ width: '100%', accentColor: 'var(--accent-amber)' }}
                        />
                      </div>

                      {/* Moisture details */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span>Moisture Content</span>
                          <span style={{ fontWeight: '600' }}>{s.moisture}%</span>
                        </div>
                        <input
                          type="range" min="8" max="22" step="0.1" value={s.moisture}
                          onChange={(e) => handleSensorChange(s.id, 'moisture', e.target.value)}
                          style={{ width: '100%', accentColor: 'var(--text-muted)' }}
                        />
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '32px' }}>
            
            {/* Create Silo / Inventory Entry Form */}
            <div className="glass" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Add Grain Storage</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Allocate a new hardware Silo monitoring system to the field.</p>
              
              <form onSubmit={handleAddSilo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Silo Unique Name</label>
                  <input
                    type="text" placeholder="e.g. Silo Epsilon" value={newSiloName}
                    onChange={(e) => setNewSiloName(e.target.value)} required
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Grain Type</label>
                    <select value={newSiloType} onChange={(e) => setNewSiloType(e.target.value)} style={inputStyle}>
                      <option value="Rice">Rice</option>
                      <option value="Wheat">Wheat</option>
                      <option value="Corn">Corn</option>
                      <option value="Barley">Barley</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Capacity (MT)</label>
                    <input
                      type="number" value={newSiloCapacity}
                      onChange={(e) => setNewSiloCapacity(e.target.value)} required min="100" max="5000"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Current Seed Stock (MT)</label>
                  <input
                    type="number" value={newSiloStock}
                    onChange={(e) => setNewSiloStock(e.target.value)} required min="0" max={newSiloCapacity}
                    style={inputStyle}
                  />
                </div>

                <button type="submit" style={{ ...mainBtnStyle, width: '100%', padding: '14px', marginTop: '8px' }}>
                  Deploy Silo Systems
                </button>
              </form>
            </div>

            {/* Inventory Aggregation & Stock levels */}
            <div className="glass" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Aggregate inventory</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Global capacity and stock by grain classification.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {['Rice', 'Wheat', 'Corn', 'Barley'].map(type => {
                  const items = silos.filter(s => s.grain_type === type);
                  const totalCap = items.reduce((acc, curr) => acc + curr.capacity, 0);
                  const totalSt = items.reduce((acc, curr) => acc + curr.current_stock, 0);
                  const percent = totalCap > 0 ? ((totalSt / totalCap) * 100).toFixed(0) : 0;
                  
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold' }}>{type}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {totalSt} / {totalCap} MT ({percent}%)
                        </span>
                      </div>
                      <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${percent}%`,
                          background: type === 'Rice' ? 'var(--accent-emerald)' :
                                     type === 'Wheat' ? '#38bdf8' :
                                     type === 'Corn' ? 'var(--accent-amber)' : '#f472b6',
                          borderRadius: '5px'
                        }}></div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Monitored in {items.length} silo(s)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div>
            <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Environmental Quality Alarms</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Immediate resolution required. Adjust silo sensor sliders below safety limits to clear.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {alerts.filter(a => !a.is_resolved).length === 0 ? (
                <div className="glass" style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--accent-emerald)' }}>
                  <div style={{ fontSize: '48px' }}>🛡️</div>
                  <h3 style={{ fontSize: '20px', margin: '12px 0 4px', color: 'var(--accent-emerald)' }}>All Systems nominal</h3>
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No critical alerts triggered. Standard monitoring thresholds fully guarded.</p>
                </div>
              ) : (
                alerts.filter(a => !a.is_resolved).map(a => {
                  const targetSilo = silos.find(s => s.id === a.silo_id);
                  return (
                    <div key={a.id} className="glass" style={{
                      padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderLeft: '5px solid var(--accent-red)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className="glow-indicator danger"></span>
                          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{a.alert_type}</span>
                          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                            {targetSilo ? targetSilo.name : 'Unknown Silo'}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{a.message}</p>
                      </div>
                      
                      <button onClick={() => handleResolveAlert(a.id)} style={mainBtnStyle}>
                        Mark Resolved
                      </button>
                    </div>
                  );
                })
              )}

              {/* Resolved History */}
              {alerts.filter(a => a.is_resolved).length > 0 && (
                <div style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-muted)' }}>Resolution History Log</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {alerts.filter(a => a.is_resolved).map(a => (
                      <div key={a.id} className="glass" style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', opacity: 0.6 }}>
                        <span style={{ textDecoration: 'line-through' }}>{a.message}</span>
                        <span style={{ color: 'var(--accent-emerald)', fontSize: '13px', fontWeight: 'bold' }}>✓ Resolved</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AUTH TAB */}
        {activeTab === 'auth' && (
          <div style={{ maxWidth: '450px', margin: '40px auto 0' }} className="glass">
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                <button
                  onClick={() => setAuthMode('login')}
                  style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', color: authMode === 'login' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  style={{ background: 'none', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', color: authMode === 'register' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Username</label>
                  <input
                    type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                    style={inputStyle}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Try preset usernames: <strong>farmer</strong> or <strong>admin</strong>
                  </span>
                </div>

                {authMode === 'register' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Email Address</label>
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                      style={inputStyle}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Password</label>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    style={inputStyle}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Password presets: <strong>farmer123</strong> or <strong>admin123</strong>
                  </span>
                </div>

                <button type="submit" style={{ ...mainBtnStyle, padding: '14px', width: '100%', fontSize: '15px' }}>
                  {authMode === 'login' ? 'Authenticate Entry' : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', padding: '32px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        <p>© 2026 GrainRise Quality Control Systems. Capstone Project.</p>
      </footer>
    </div>
  );
}

// Styling Helper Variables
const btnStyle = (isActive) => ({
  background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'none',
  border: 'none',
  borderRadius: '8px',
  color: isActive ? 'var(--accent-emerald)' : 'var(--text-primary)',
  padding: '10px 18px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  border: isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
});

const mainBtnStyle = {
  background: 'linear-gradient(135deg, var(--accent-emerald), #059669)',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  padding: '10px 20px',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
};

const subBtnStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: '13px',
  transition: 'all 0.2s'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(16, 185, 129, 0.2)',
  color: '#fff',
  fontSize: '14px',
  outline: 'none',
  transition: 'border 0.2s'
};

export default App;
