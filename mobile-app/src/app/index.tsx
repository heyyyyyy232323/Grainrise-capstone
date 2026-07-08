import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Dimensions
} from 'react-native';

const API_BASE = 'http://10.0.2.2:8000'; // Standard Android emulator localhost fallback

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'silos' | 'alerts' | 'auth'
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [user, setUser] = useState(null); // { username, role }
  
  // Auth states
  const [username, setUsername] = useState('farmer');
  const [password, setPassword] = useState('farmer123');

  // Silos state
  const [silos, setSilos] = useState([
    { id: 1, name: 'Silo Alpha', grain_type: 'Rice', capacity: 1000.0, current_stock: 780.0, temperature: 24.5, humidity: 55.2, moisture: 13.1 },
    { id: 2, name: 'Silo Beta', grain_type: 'Wheat', capacity: 1500.0, current_stock: 120.0, temperature: 26.0, humidity: 58.0, moisture: 14.5 },
    { id: 3, name: 'Silo Gamma', grain_type: 'Corn', capacity: 800.0, current_stock: 750.0, temperature: 31.2, humidity: 68.5, moisture: 17.2 },
    { id: 4, name: 'Silo Delta', grain_type: 'Rice', capacity: 1200.0, current_stock: 950.0, temperature: 22.1, humidity: 50.0, moisture: 12.2 }
  ]);

  // Alerts
  const [alerts, setAlerts] = useState([
    { id: 1, silo_id: 3, alert_type: 'Critical Humidity', message: 'Silo Gamma humidity is 68.5% (exceeds safe threshold of 60%). Spoilage risk detected!', is_resolved: false },
    { id: 2, silo_id: 3, alert_type: 'Critical Temperature', message: 'Silo Gamma temperature is 31.2°C. Elevated temperature detected.', is_resolved: false }
  ]);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_BASE}/`);
        if (res.ok) {
          setIsApiConnected(true);
          const silosRes = await fetch(`${API_BASE}/api/silos`);
          if (silosRes.ok) {
            const data = await silosRes.json();
            setSilos(data);
          }
          const alertsRes = await fetch(`${API_BASE}/api/alerts`);
          if (alertsRes.ok) {
            const data = await alertsRes.json();
            setAlerts(data);
          }
        } else {
          setIsApiConnected(false);
        }
      } catch (err) {
        setIsApiConnected(false);
      }
    };
    checkConnection();
    const timer = setInterval(checkConnection, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = () => {
    if (password.length >= 4) {
      setUser({ username, role: username === 'admin' ? 'admin' : 'farmer' });
      setActiveTab('silos');
    }
  };

  const handleSensorValueChange = async (siloId, field, increment) => {
    const updated = silos.map(s => {
      if (s.id === siloId) {
        const newVal = Math.max(0, parseFloat((s[field] + increment).toFixed(1)));
        const updatedSilo = { ...s, [field]: newVal };
        
        // Local trigger logic
        if (!isApiConnected) {
          if (field === 'humidity' && newVal > 60) {
            const exists = alerts.some(a => a.silo_id === s.id && a.alert_type === 'Critical Humidity' && !a.is_resolved);
            if (!exists) {
              setAlerts(prev => [{
                id: Date.now(),
                silo_id: s.id,
                alert_type: 'Critical Humidity',
                message: `${s.name} humidity is ${newVal}%. Spoilage risk detected!`,
                is_resolved: false
              }, ...prev]);
            }
          }
          if (field === 'temperature' && newVal > 30) {
            const exists = alerts.some(a => a.silo_id === s.id && a.alert_type === 'Critical Temperature' && !a.is_resolved);
            if (!exists) {
              setAlerts(prev => [{
                id: Date.now() + 1,
                silo_id: s.id,
                alert_type: 'Critical Temperature',
                message: `${s.name} temperature is ${newVal}°C. Dangerously high!`,
                is_resolved: false
              }, ...prev]);
            }
          }
        }
        return updatedSilo;
      }
      return s;
    });
    setSilos(updated);

    if (isApiConnected) {
      try {
        const target = updated.find(s => s.id === siloId);
        await fetch(`${API_BASE}/api/silos/${siloId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: target[field] })
        });
      } catch (err) {
        console.warn("Backend update failed");
      }
    }
  };

  const handleResolveAlert = async (alertId) => {
    if (isApiConnected) {
      try {
        const res = await fetch(`${API_BASE}/api/alerts/${alertId}`, { method: 'PUT' });
        if (res.ok) {
          const freshAlerts = await fetch(`${API_BASE}/api/alerts`);
          const data = await freshAlerts.json();
          setAlerts(data);
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
    }
  };

  const activeAlertsCount = alerts.filter(a => !a.is_resolved).length;
  const totalStock = silos.reduce((acc, c) => acc + c.current_stock, 0);

  return (
    <View style={styles.appContainer}>
      
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🌾 GrainRise</Text>
          <Text style={styles.headerSub}>{isApiConnected ? '⚡ Connected to API' : '🟢 Sensor Simulation Mode'}</Text>
        </View>
        
        {user ? (
          <TouchableOpacity style={styles.profileBtn} onPress={() => setUser(null)}>
            <Text style={styles.profileText}>{user.username[0].toUpperCase()}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={() => setActiveTab('auth')}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HOMEPAGE VIEW */}
        {activeTab === 'home' && (
          <View style={styles.tabContent}>
            
            {/* Logo/Hero card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroEmoji}>🌾</Text>
              <Text style={styles.heroTitle}>Sustainable Grain Quality Systems</Text>
              <Text style={styles.heroDesc}>
                Real-time Temperature, Spoilage danger monitor, and grain volume calculations.
              </Text>
              <TouchableOpacity style={styles.ctaBtn} onPress={() => setActiveTab('silos')}>
                <Text style={styles.ctaBtnText}>Launch Dashboard</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricTitle}>Storage Used</Text>
                <Text style={styles.metricVal}>{totalStock.toFixed(0)} MT</Text>
                <Text style={styles.metricSub}>Silos active: {silos.length}</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricTitle}>App Alerts</Text>
                <Text style={[styles.metricVal, { color: activeAlertsCount > 0 ? '#ef4444' : '#10b981' }]}>
                  {activeAlertsCount}
                </Text>
                <Text style={styles.metricSub}>Requires attention</Text>
              </View>
            </View>

            {/* Capstone Outline */}
            <View style={styles.infoCard}>
              <Text style={styles.sectionHeader}>Mobile Client Features</Text>
              <Text style={styles.bulletItem}>• Live status checklists for active Silos</Text>
              <Text style={styles.bulletItem}>• Sensor simulation tools for quick testing</Text>
              <Text style={styles.bulletItem}>• Push style alert feed on threshold triggers</Text>
            </View>

          </View>
        )}

        {/* SILOS DASHBOARD VIEW */}
        {activeTab === 'silos' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>Active Silos Monitoring</Text>
            <Text style={styles.sectionSub}>Edit silo properties using the controls to simulate changes</Text>

            {silos.map(s => {
              const fillPercent = ((s.current_stock / s.capacity) * 100).toFixed(0);
              const hasAlerts = alerts.some(a => a.silo_id === s.id && !a.is_resolved);
              
              return (
                <View key={s.id} style={[styles.siloCard, hasAlerts && styles.siloCardWarning]}>
                  <View style={styles.siloCardHeader}>
                    <Text style={styles.siloName}>{s.name}</Text>
                    <Text style={styles.siloGrain}>{s.grain_type}</Text>
                  </View>
                  
                  {/* Fill percent bar */}
                  <View style={styles.fillBarContainer}>
                    <View style={styles.fillBarLabels}>
                      <Text style={styles.fillText}>Fill level: {fillPercent}%</Text>
                      <Text style={styles.fillText}>{s.current_stock} / {s.capacity} MT</Text>
                    </View>
                    <View style={styles.fillTrack}>
                      <View style={[styles.fillBar, { width: `${fillPercent}%` }]} />
                    </View>
                  </View>

                  {/* Sensor Feed display */}
                  <View style={styles.sensorsGrid}>
                    <View style={styles.sensorBox}>
                      <Text style={styles.sensorTitle}>Temperature</Text>
                      <Text style={[styles.sensorVal, s.temperature > 30 && { color: '#ef4444' }]}>{s.temperature}°C</Text>
                      <View style={styles.controlRow}>
                        <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSensorValueChange(s.id, 'temperature', -0.5)}>
                          <Text style={styles.ctrlText}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSensorValueChange(s.id, 'temperature', 0.5)}>
                          <Text style={styles.ctrlText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.sensorBox}>
                      <Text style={styles.sensorTitle}>Humidity</Text>
                      <Text style={[styles.sensorVal, s.humidity > 60 && { color: '#ef4444' }]}>{s.humidity}%</Text>
                      <View style={styles.controlRow}>
                        <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSensorValueChange(s.id, 'humidity', -1)}>
                          <Text style={styles.ctrlText}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ctrlBtn} onPress={() => handleSensorValueChange(s.id, 'humidity', 1)}>
                          <Text style={styles.ctrlText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                </View>
              );
            })}
          </View>
        )}

        {/* ALERTS MODULE */}
        {activeTab === 'alerts' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>System Warnings ({activeAlertsCount})</Text>
            
            {activeAlertsCount === 0 ? (
              <View style={styles.emptyAlertsCard}>
                <Text style={styles.emptyAlertsText}>🛡️ Systems fully nominal</Text>
                <Text style={styles.emptyAlertsSub}>All metrics are within target limits</Text>
              </View>
            ) : (
              alerts.filter(a => !a.is_resolved).map(a => (
                <View key={a.id} style={styles.alertCard}>
                  <View style={styles.alertHeaderRow}>
                    <Text style={styles.alertBadge}>CRITICAL</Text>
                    <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolveAlert(a.id)}>
                      <Text style={styles.resolveText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.alertMsg}>{a.message}</Text>
                </View>
              ))
            )}

            {/* Resolved logs */}
            {alerts.filter(a => a.is_resolved).length > 0 && (
              <View style={{ marginTop: 24 }}>
                <Text style={styles.sectionSub}>Cleared recently</Text>
                {alerts.filter(a => a.is_resolved).map(a => (
                  <View key={a.id} style={[styles.alertCard, { opacity: 0.5 }]}>
                    <Text style={{ color: '#fff', textDecorationLine: 'line-through' }}>{a.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* AUTH TAB */}
        {activeTab === 'auth' && (
          <View style={styles.tabContent}>
            <View style={styles.authCard}>
              <Text style={styles.sectionHeader}>Operator Login</Text>
              <Text style={styles.sectionSub}>Access admin controls and field logs</Text>
              
              <TextInput
                style={styles.authInput}
                placeholder="Username (e.g. farmer)"
                placeholderTextColor="#666"
                value={username}
                onChangeText={setUsername}
              />
              <TextInput
                style={styles.authInput}
                placeholder="Password (e.g. farmer123)"
                placeholderTextColor="#666"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity style={styles.ctaBtn} onPress={handleLogin}>
                <Text style={styles.ctaBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Navigation Tab Bar */}
      <View style={styles.footerTabBar}>
        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabBarIcon, activeTab === 'home' && styles.tabBarActiveIcon]}>🏠</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'home' && styles.tabBarActiveLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('silos')}>
          <Text style={[styles.tabBarIcon, activeTab === 'silos' && styles.tabBarActiveIcon]}>📊</Text>
          <Text style={[styles.tabBarLabel, activeTab === 'silos' && styles.tabBarActiveLabel]}>Silos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('alerts')}>
          <View>
            <Text style={[styles.tabBarIcon, activeTab === 'alerts' && styles.tabBarActiveIcon]}>🚨</Text>
            {activeAlertsCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{activeAlertsCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabBarLabel, activeTab === 'alerts' && styles.tabBarActiveLabel]}>Alerts</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#080f0b',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#10b98122',
    backgroundColor: '#0f1c14'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#10b981',
    fontSize: 11,
    marginTop: 2
  },
  loginBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderColor: '#10b981',
    borderWidth: 1
  },
  loginBtnText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: 'bold'
  },
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  scrollContent: {
    paddingBottom: 80,
  },
  tabContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#0f1c14',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b98122',
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  heroDesc: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20
  },
  ctaBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center'
  },
  ctaBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#0f1c14',
    borderWidth: 1,
    borderColor: '#10b98122',
    borderRadius: 12,
    padding: 16,
  },
  metricTitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 4
  },
  metricVal: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  metricSub: {
    color: '#6b7280',
    fontSize: 11
  },
  infoCard: {
    backgroundColor: '#0f1c14',
    borderWidth: 1,
    borderColor: '#10b98122',
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  sectionSub: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 16
  },
  bulletItem: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8
  },
  siloCard: {
    backgroundColor: '#0f1c14',
    borderWidth: 1,
    borderColor: '#10b98122',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  siloCardWarning: {
    borderColor: '#ef4444aa',
  },
  siloCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  siloName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  siloGrain: {
    color: '#10b981',
    fontWeight: 'bold'
  },
  fillBarContainer: {
    marginBottom: 16
  },
  fillBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  fillText: {
    color: '#9ca3af',
    fontSize: 12
  },
  fillTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3
  },
  fillBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3
  },
  sensorsGrid: {
    flexDirection: 'row',
    gap: 12
  },
  sensorBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  sensorTitle: {
    color: '#6b7280',
    fontSize: 11,
    marginBottom: 4
  },
  sensorVal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12
  },
  ctrlBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#10b98122',
    borderColor: '#10b98144',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ctrlText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold'
  },
  emptyAlertsCard: {
    backgroundColor: '#0f1c14',
    borderWidth: 1,
    borderColor: '#10b98133',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center'
  },
  emptyAlertsText: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  emptyAlertsSub: {
    color: '#9ca3af',
    fontSize: 12
  },
  alertCard: {
    backgroundColor: '#0f1c14',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  alertBadge: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12
  },
  resolveBtn: {
    backgroundColor: '#ef444422',
    borderColor: '#ef444455',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 12
  },
  resolveText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold'
  },
  alertMsg: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18
  },
  authCard: {
    backgroundColor: '#0f1c14',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#10b98122'
  },
  authInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: '#10b98133',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    marginBottom: 16
  },
  footerTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#0f1c14',
    borderTopWidth: 1,
    borderTopColor: '#10b98122',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabBarIcon: {
    fontSize: 20,
    opacity: 0.4
  },
  tabBarActiveIcon: {
    opacity: 1
  },
  tabBarLabel: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 2
  },
  tabBarActiveLabel: {
    color: '#10b981',
    fontWeight: 'bold'
  },
  badgeCount: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
