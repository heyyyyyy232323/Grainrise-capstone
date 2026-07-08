import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function ExploreScreen() {
  const [silos] = useState([
    { id: 1, name: 'Silo Alpha', grain_type: 'Rice', capacity: 1000.0, current_stock: 780.0 },
    { id: 2, name: 'Silo Beta', grain_type: 'Wheat', capacity: 1500.0, current_stock: 120.0 },
    { id: 3, name: 'Silo Gamma', grain_type: 'Corn', capacity: 800.0, current_stock: 750.0 },
    { id: 4, name: 'Silo Delta', grain_type: 'Rice', capacity: 1200.0, current_stock: 950.0 }
  ]);

  const grainTypes = ['Rice', 'Wheat', 'Corn', 'Barley'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Aggregate Inventory</Text>
      <Text style={styles.subtitle}>Current stock levels across all registered silos</Text>

      {grainTypes.map(type => {
        const typeSilos = silos.filter(s => s.grain_type === type);
        const totalCapacity = typeSilos.reduce((acc, curr) => acc + curr.capacity, 0);
        const totalStock = typeSilos.reduce((acc, curr) => acc + curr.current_stock, 0);
        const percent = totalCapacity > 0 ? ((totalStock / totalCapacity) * 100).toFixed(0) : 0;

        return (
          <View key={type} style={styles.grainCard}>
            <View style={styles.grainHeader}>
              <Text style={styles.grainName}>{type}</Text>
              <Text style={styles.grainStats}>{totalStock} / {totalCapacity} MT ({percent}%)</Text>
            </View>

            <View style={styles.track}>
              <View style={[
                styles.bar,
                {
                  width: `${percent}%`,
                  backgroundColor: type === 'Rice' ? '#10b981' :
                                   type === 'Wheat' ? '#38bdf8' :
                                   type === 'Corn' ? '#eab308' : '#f472b6'
                }
              ]} />
            </View>
            <Text style={styles.siloCount}>Monitored in {typeSilos.length} silo(s)</Text>
          </View>
        );
      })}

      {/* Guide Card */}
      <View style={styles.guideCard}>
        <Text style={styles.guideHeader}>Hardware QR Integrator</Text>
        <Text style={styles.guideDesc}>
          Scan a Silo Gateway QR code to connect physical telemetry streams directly to this dashboard. (Sensor simulators are simulated on the Silos tab).
        </Text>
        <TouchableOpacity style={styles.scanBtn}>
          <Text style={styles.scanBtnText}>📷 Open Camera Scanner</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080f0b',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 24
  },
  grainCard: {
    backgroundColor: '#0f1c14',
    borderWidth: 1,
    borderColor: '#10b98122',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  grainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  grainName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  grainStats: {
    color: '#cbd5e1',
    fontSize: 13
  },
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    marginBottom: 8
  },
  bar: {
    height: '100%',
    borderRadius: 4
  },
  siloCount: {
    color: '#6b7280',
    fontSize: 11
  },
  guideCard: {
    backgroundColor: '#0f1c14',
    borderWidth: 1,
    borderColor: '#10b98122',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    alignItems: 'center'
  },
  guideHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  guideDesc: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16
  },
  scanBtn: {
    backgroundColor: '#10b98122',
    borderColor: '#10b98155',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  scanBtnText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
