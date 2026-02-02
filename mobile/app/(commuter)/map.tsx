import { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Platform, TextInput, FlatList } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore, Route } from '../../src/store/locationStore';
import { DEFAULT_REGION, API_URL } from '../../src/config';

// Route colors for visual distinction
const ROUTE_COLORS = [
  '#1a73e8', '#e53935', '#43a047', '#fb8c00', '#8e24aa',
  '#00acc1', '#d81b60', '#3949ab', '#7cb342', '#f4511e',
];

const getRouteColor = (index: number) => ROUTE_COLORS[index % ROUTE_COLORS.length];

export default function CommuterMap() {
  const {
    userLocation,
    jeepneys,
    routes,
    setRoutes,
    subscribedRouteId,
    requestLocationPermission,
    startUserTracking,
    subscribeToRoute,
  } = useLocationStore();

  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [destination, setDestination] = useState('');
  const [matchingRoutes, setMatchingRoutes] = useState<Route[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    initializeLocation();
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/routes`);
      const responseText = await response.text();
      
      try {
        const data = JSON.parse(responseText);
        if (data.success) {
          setRoutes(data.data);
        }
      } catch (e) {
        console.error('Failed to parse routes JSON. Response:', responseText);
        Alert.alert('Server Error', 'The server returned an invalid response. Check the console for details.');
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    }
  };

  const initializeLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to see nearby jeepneys.',
        [{ text: 'OK' }]
      );
      return;
    }
    await startUserTracking();
  };

  const findRoutes = () => {
    if (!destination.trim()) {
      setMatchingRoutes([]);
      return;
    }

    // Simple search: match name or description
    // In a real app, this would use geocoding to match location
    const matched = routes.filter(r => 
      r.name.toLowerCase().includes(destination.toLowerCase()) ||
      r.description?.toLowerCase().includes(destination.toLowerCase()) ||
      r.code.toLowerCase().includes(destination.toLowerCase())
    );
    
    setMatchingRoutes(matched);
    setIsSearching(true);
  };

  const selectRoute = (route: Route) => {
    subscribeToRoute(route.id);
    setIsSearching(false);
    setDestination(route.name);
    
    // Zoom to route start point
    setMapRegion({
      latitude: route.start_point.latitude,
      longitude: route.start_point.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  useEffect(() => {
    if (userLocation && !subscribedRouteId) {
      setMapRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [userLocation]);

  const centerOnUser = () => {
    if (userLocation) {
      setMapRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const jeepneyList = Array.from(jeepneys.values());
  const activeRoute = subscribedRouteId ? routes.find(r => r.id === subscribedRouteId) : null;

  // Get polyline points for a route
  const getRoutePolylinePoints = (route: Route) => {
    if (!route.waypoints || route.waypoints.length === 0) {
      // If no waypoints, draw straight line between start and end
      return [
        { latitude: route.start_point.latitude, longitude: route.start_point.longitude },
        { latitude: route.end_point.latitude, longitude: route.end_point.longitude }
      ];
    }
    return [
      { latitude: route.start_point.latitude, longitude: route.start_point.longitude },
      ...route.waypoints.map(wp => ({ latitude: wp.latitude, longitude: wp.longitude })),
      { latitude: route.end_point.latitude, longitude: route.end_point.longitude }
    ];
  };

  // Get routes with waypoints to display
  const routesWithPaths = routes.filter(r => r.waypoints && r.waypoints.length > 0);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Render all route polylines with different colors */}
        {routesWithPaths.map((route, index) => (
          <Polyline
            key={`route-polyline-${route.id}`}
            coordinates={getRoutePolylinePoints(route)}
            strokeColor={route.id === subscribedRouteId 
              ? getRouteColor(index) 
              : `${getRouteColor(index)}99`}
            strokeWidth={route.id === subscribedRouteId ? 5 : 3}
            lineDashPattern={route.id === subscribedRouteId ? undefined : [5, 5]}
          />
        ))}

        {/* Route endpoint markers for active route */}
        {activeRoute && (
          <>
            <Marker
              coordinate={activeRoute.start_point}
              title={`Start: ${activeRoute.name}`}
              pinColor="#4caf50"
            />
            <Marker
              coordinate={activeRoute.end_point}
              title={`End: ${activeRoute.name}`}
              pinColor="#e53935"
            />
          </>
        )}

        {/* Jeepney markers */}
        {jeepneyList.map((jeepney) => (
          <Marker
            key={jeepney.jeepney_id}
            coordinate={{
              latitude: jeepney.latitude,
              longitude: jeepney.longitude,
            }}
            title={`Jeepney ${jeepney.jeepney_id.slice(0, 8)}`}
            description={`Route: ${jeepney.route_id}`}
            rotation={jeepney.heading || 0}
          >
            <View style={styles.jeepneyMarker}>
              <Ionicons name="bus" size={20} color="#fff" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={findRoutes}
          />
          {destination.length > 0 && (
            <TouchableOpacity onPress={() => { setDestination(''); setMatchingRoutes([]); setIsSearching(false); }}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {isSearching && matchingRoutes.length > 0 && (
          <View style={styles.resultsList}>
            <FlatList
              data={matchingRoutes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => selectRoute(item)}>
                  <Ionicons name="git-branch" size={20} color="#1a73e8" />
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultDesc}>{item.description}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Info overlay */}
      {!isSearching && subscribedRouteId && (
        <View style={styles.infoOverlay}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="navigate" size={24} color="#1a73e8" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  {routes.find(r => r.id === subscribedRouteId)?.name || 'Active Route'}
                </Text>
                <Text style={styles.infoText}>
                  {jeepneyList.length} jeepney{jeepneyList.length !== 1 ? 's' : ''} available
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Center on user button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={24} color="#1a73e8" />
      </TouchableOpacity>

      {/* No jeepneys message */}
      {!isSearching && subscribedRouteId && jeepneyList.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bus-outline" size={48} color="#999" />
          <Text style={styles.emptyText}>No jeepneys on this route</Text>
          <Text style={styles.emptySubtext}>We'll notify you when one appears</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  jeepneyMarker: {
    backgroundColor: '#1a73e8',
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  resultsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  centerButton: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
