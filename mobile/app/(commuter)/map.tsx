import { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, Platform, TextInput, FlatList } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore, Route } from '../../src/store/locationStore';
import { DEFAULT_REGION, API_URL, MAPTILER_API_KEY } from '../../src/config';

// Minimal route color palette
const ROUTE_COLORS = [
  '#000000', '#374151', '#6b7280', '#1f2937', '#4b5563',
  '#9ca3af', '#111827', '#52525b', '#27272a', '#3f3f46',
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
        mapType={Platform.OS === 'android' ? "none" : "standard"}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {Platform.OS === 'android' && (
          <UrlTile
            urlTemplate={`https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`}
            maximumZ={18}
            flipY={false}
          />
        )}

        {/* Render all route polylines */}
        {routesWithPaths.map((route, index) => (
          <Polyline
            key={`route-polyline-${route.id}`}
            coordinates={getRoutePolylinePoints(route)}
            strokeColor={route.id === subscribedRouteId ? '#000' : getRouteColor(index)}
            strokeWidth={route.id === subscribedRouteId ? 5 : 3}
            lineDashPattern={route.id === subscribedRouteId ? undefined : [1, 8]}
            lineJoin="round"
            lineCap="round"
          />
        ))}

        {/* Route endpoint markers for active route */}
        {activeRoute && (
          <>
            <Marker
              coordinate={activeRoute.start_point}
              title={`Start: ${activeRoute.name}`}
            >
              <View style={styles.startMarker}>
                <Ionicons name="play-circle" size={24} color="#000" />
              </View>
            </Marker>
            <Marker
              coordinate={activeRoute.end_point}
              title={`End: ${activeRoute.name}`}
            >
              <View style={styles.endMarker}>
                <Ionicons name="flag" size={24} color="#000" />
              </View>
            </Marker>
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
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search destination..."
            placeholderTextColor="#9ca3af"
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={findRoutes}
          />
          {destination.length > 0 && (
            <TouchableOpacity onPress={() => { setDestination(''); setMatchingRoutes([]); setIsSearching(false); }}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
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
                  <Ionicons name="location" size={18} color="#000" />
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
              <Ionicons name="navigate-outline" size={22} color="#000" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>
                  {routes.find(r => r.id === subscribedRouteId)?.name || 'Active Route'}
                </Text>
                <Text style={styles.infoText}>
                  {jeepneyList.length} {jeepneyList.length === 1 ? 'jeepney' : 'jeepneys'} nearby
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Center on user button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={22} color="#000" />
      </TouchableOpacity>

      {/* No jeepneys message */}
      {!isSearching && subscribedRouteId && jeepneyList.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bus-outline" size={44} color="#d1d5db" />
          <Text style={styles.emptyText}>No jeepneys available</Text>
          <Text style={styles.emptySubtext}>Check back in a few minutes</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  startMarker: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  endMarker: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  jeepneyMarker: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },
  resultsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 12,
    maxHeight: 280,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    letterSpacing: -0.2,
  },
  resultDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 3,
    fontWeight: '400',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 14,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '400',
  },
  centerButton: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyState: {
    position: 'absolute',
    bottom: 180,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginTop: 16,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    fontWeight: '400',
  },
});
