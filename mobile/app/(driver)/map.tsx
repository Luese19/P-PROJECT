import { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useLocationStore, Route, Coordinate } from '../../src/store/locationStore';
import { useAuthStore } from '../../src/store/authStore';
import { DEFAULT_REGION, API_URL } from '../../src/config';

// Route colors for visual distinction
const ROUTE_COLORS = [
  '#1a73e8', '#e53935', '#43a047', '#fb8c00', '#8e24aa',
  '#00acc1', '#d81b60', '#3949ab', '#7cb342', '#f4511e',
];

const getRouteColor = (index: number) => ROUTE_COLORS[index % ROUTE_COLORS.length];

export default function DriverMap() {
  const {
    userLocation,
    isSharing,
    currentRouteId,
    routes,
    setRoutes,
    requestLocationPermission,
    startUserTracking,
    startSharing,
    stopSharing,
  } = useLocationStore();

  const { user, session } = useAuthStore();

  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFareModal, setShowFareModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isSavingFares, setIsSavingFares] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // New route form state
  const [newRoute, setNewRoute] = useState({
    name: '',
    code: '',
    description: '',
    fare_base: '13',
    fare_student: '10',
    fare_senior: '10',
    fare_pwd: '10',
  });

  // Fare edit state
  const [editFares, setEditFares] = useState({
    fare_base: '',
    fare_student: '',
    fare_senior: '',
    fare_pwd: '',
  });

  // Route recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedWaypoints, setRecordedWaypoints] = useState<Coordinate[]>([]);
  const [recordingRouteId, setRecordingRouteId] = useState<string | null>(null);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRecordedLocation = useRef<Coordinate | null>(null);

  useEffect(() => {
    initializeLocation();
    fetchRoutes();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Pulse animation for active sharing
  useEffect(() => {
    if (isSharing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSharing]);

  const fetchRoutes = async () => {
    setIsLoadingRoutes(true);
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
        // Error could be "Not Found" or "Internal Server Error"
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      Alert.alert('Error', 'Failed to load routes');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!newRoute.name || !newRoute.code || !userLocation) {
      Alert.alert('Error', 'Please fill in required fields and ensure location is enabled');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...newRoute,
          fare_base: parseFloat(newRoute.fare_base) || 13,
          fare_student: parseFloat(newRoute.fare_student) || 10,
          fare_senior: parseFloat(newRoute.fare_senior) || 10,
          fare_pwd: parseFloat(newRoute.fare_pwd) || 10,
          start_point: userLocation,
          end_point: userLocation,
          waypoints: [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Custom route created!');
        await fetchRoutes();
        setSelectedRoute(data.data);
        setShowCreateModal(false);
        setShowRouteModal(false);
        setNewRoute({
          name: '',
          code: '',
          description: '',
          fare_base: '13',
          fare_student: '10',
          fare_senior: '10',
          fare_pwd: '10',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create route');
    }
  };

  const handleEditFares = (route: Route) => {
    setEditFares({
      fare_base: route.fare_base?.toString() || '13',
      fare_student: route.fare_student?.toString() || '10',
      fare_senior: route.fare_senior?.toString() || '10',
      fare_pwd: route.fare_pwd?.toString() || '10',
    });
    setSelectedRoute(route);
    setShowFareModal(true);
  };

  const handleSaveFares = async () => {
    if (!selectedRoute) return;

    if (!session?.access_token) {
      Alert.alert('Error', 'You must be logged in to update fares. Please sign out and sign in again.');
      return;
    }

    setIsSavingFares(true);
    try {
      const response = await fetch(`${API_URL}/api/routes/${selectedRoute.id}/fares`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fare_base: parseFloat(editFares.fare_base) || 13,
          fare_student: parseFloat(editFares.fare_student) || 10,
          fare_senior: parseFloat(editFares.fare_senior) || 10,
          fare_pwd: parseFloat(editFares.fare_pwd) || 10,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        Alert.alert('Success', 'Fares updated successfully!');
        await fetchRoutes();
        setSelectedRoute(data.data);
        setShowFareModal(false);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Save fares error:', error);
      Alert.alert('Error', error.message || 'Failed to update fares');
    } finally {
      setIsSavingFares(false);
    }
  };

  const initializeLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Location Required',
        'Enable location services to share your position with commuters.',
        [{ text: 'OK' }]
      );
      return;
    }
    await startUserTracking();
  };

  useEffect(() => {
    if (userLocation) {
      setMapRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [userLocation]);

  const handleStartSharing = () => {
    if (!selectedRoute) {
      setShowRouteModal(true);
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    // Generate a valid UUID for the jeepney
    const jeepneyId = Crypto.randomUUID();
    startSharing(user.id, selectedRoute.id, jeepneyId);
  };

  const handleStopSharing = () => {
    Alert.alert(
      'Stop Sharing',
      'Are you sure you want to stop sharing your location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            if (user) {
              stopSharing(user.id);
            }
          },
        },
      ]
    );
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    setShowRouteModal(false);
  };

  const centerOnUser = () => {
    if (userLocation) {
      setMapRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Calculate distance between two coordinates in meters
  const getDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Start recording route waypoints
  const startRecording = (route: Route) => {
    if (!userLocation) {
      Alert.alert('Error', 'Location not available. Please wait for GPS.');
      return;
    }

    Alert.alert(
      'Record Route Path',
      `Start recording the path for "${route.name}"? Drive along your route and we'll capture the path.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Recording',
          onPress: () => {
            setRecordingRouteId(route.id);
            setIsRecording(true);
            setRecordedWaypoints([userLocation]);
            lastRecordedLocation.current = userLocation;

            // Record waypoints every 3 seconds if moved more than 20 meters
            recordingInterval.current = setInterval(() => {
              const currentLocation = useLocationStore.getState().userLocation;
              if (currentLocation && lastRecordedLocation.current) {
                const distance = getDistance(lastRecordedLocation.current, currentLocation);
                if (distance > 20) { // Only record if moved more than 20 meters
                  setRecordedWaypoints(prev => [...prev, currentLocation]);
                  lastRecordedLocation.current = currentLocation;
                }
              }
            }, 3000);
          },
        },
      ]
    );
  };

  // Stop recording and save waypoints
  const stopRecording = async () => {
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }

    if (recordedWaypoints.length < 2) {
      Alert.alert('Error', 'Not enough waypoints recorded. Please drive along the route.');
      setIsRecording(false);
      setRecordingRouteId(null);
      setRecordedWaypoints([]);
      return;
    }

    Alert.alert(
      'Save Route Path',
      `You recorded ${recordedWaypoints.length} waypoints. Save this path?`,
      [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setIsRecording(false);
            setRecordingRouteId(null);
            setRecordedWaypoints([]);
          },
        },
        {
          text: 'Save',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/routes/${recordingRouteId}/waypoints`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  waypoints: recordedWaypoints,
                  start_point: recordedWaypoints[0],
                  end_point: recordedWaypoints[recordedWaypoints.length - 1],
                }),
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Route path saved successfully!');
                await fetchRoutes();
                // Update selected route with new waypoints
                if (selectedRoute?.id === recordingRouteId) {
                  setSelectedRoute(data.data);
                }
              } else {
                throw new Error(data.error);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to save route path');
            } finally {
              setIsRecording(false);
              setRecordingRouteId(null);
              setRecordedWaypoints([]);
            }
          },
        },
      ]
    );
  };

  // Get polyline points for a route
  const getRoutePolylinePoints = (route: Route): Coordinate[] => {
    if (route.waypoints && route.waypoints.length > 0) {
      return route.waypoints;
    }
    // Fallback to start and end points if no waypoints
    return [route.start_point, route.end_point];
  };

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
        {/* Display all route polylines */}
        {routes.map((route, index) => {
          const points = getRoutePolylinePoints(route);
          if (points.length < 2) return null;
          return (
            <Polyline
              key={route.id}
              coordinates={points}
              strokeColor={getRouteColor(index)}
              strokeWidth={selectedRoute?.id === route.id ? 5 : 3}
              lineDashPattern={selectedRoute?.id === route.id ? undefined : [10, 5]}
            />
          );
        })}

        {/* Currently recording path */}
        {isRecording && recordedWaypoints.length > 1 && (
          <Polyline
            coordinates={recordedWaypoints}
            strokeColor="#e53935"
            strokeWidth={6}
          />
        )}

        {/* Start/End markers for selected route */}
        {selectedRoute && selectedRoute.waypoints && selectedRoute.waypoints.length > 0 && (
          <>
            <Marker
              coordinate={selectedRoute.waypoints[0]}
              title="Start"
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.routeMarker}>
                <Ionicons name="flag" size={16} color="#4caf50" />
              </View>
            </Marker>
            <Marker
              coordinate={selectedRoute.waypoints[selectedRoute.waypoints.length - 1]}
              title="End"
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.routeMarker}>
                <Ionicons name="flag" size={16} color="#e53935" />
              </View>
            </Marker>
          </>
        )}

        {userLocation && (
          <Marker coordinate={userLocation} title="Your Location">
            <Animated.View
              style={[
                styles.driverMarker,
                isSharing && styles.driverMarkerActive,
                isRecording && styles.driverMarkerRecording,
                { transform: [{ scale: isSharing ? pulseAnim : 1 }] },
              ]}
            >
              <Ionicons name="bus" size={28} color="#fff" />
            </Animated.View>
          </Marker>
        )}
      </MapView>

      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>
            Recording Route • {recordedWaypoints.length} points
          </Text>
          <TouchableOpacity style={styles.stopRecordingButton} onPress={stopRecording}>
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Status Card */}
      <Animated.View style={[styles.statusOverlay, { opacity: fadeAnim }]}>
        <View style={[styles.statusCard, isSharing && styles.statusCardActive]}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, isSharing && styles.statusDotActive]} />
              <View>
                <Text style={[styles.statusText, isSharing && styles.statusTextActive]}>
                  {isSharing ? 'Live Tracking' : 'Offline'}
                </Text>
                {selectedRoute && (
                  <Text style={[styles.routeCodeText, isSharing && styles.routeCodeTextActive]}>
                    {selectedRoute.code}
                  </Text>
                )}
              </View>
            </View>
            {isSharing && (
              <View style={styles.liveIndicator}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          {selectedRoute && (
            <Text style={[styles.routeName, isSharing && styles.routeNameActive]} numberOfLines={1}>
              {selectedRoute.name}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Route Selection Button */}
      {!isSharing && (
        <Animated.View style={[styles.routeButtonContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.routeButton, selectedRoute && styles.routeButtonSelected]}
            onPress={() => setShowRouteModal(true)}
          >
            <Ionicons
              name="map-outline"
              size={22}
              color={selectedRoute ? '#fff' : '#1a73e8'}
            />
            <Text style={[styles.routeButtonText, selectedRoute && styles.routeButtonTextSelected]}>
              {selectedRoute ? selectedRoute.code : 'Select Route'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={selectedRoute ? '#fff' : '#1a73e8'}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Center Button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={26} color="#1a73e8" />
      </TouchableOpacity>

      {/* Main Action Button */}
      <Animated.View style={[styles.actionButtonContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.actionButton, isSharing ? styles.stopButton : styles.startButton]}
          onPress={isSharing ? handleStopSharing : handleStartSharing}
          activeOpacity={0.8}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons
              name={isSharing ? 'stop-circle' : 'play-circle'}
              size={36}
              color="#fff"
            />
            <Text style={styles.actionButtonText}>
              {isSharing ? 'Stop Sharing' : 'Start Sharing'}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Route selection modal */}
      <Modal
        visible={showRouteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Your Route</Text>
                <Text style={styles.modalSubtitle}>Choose the route you'll be driving</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRouteModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close-circle" size={32} color="#666" />
              </TouchableOpacity>
            </View>

            {isLoadingRoutes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a73e8" />
                <Text style={styles.loadingText}>Loading routes...</Text>
              </View>
            ) : (
              <FlatList
                data={routes}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <View style={[
                    styles.routeItem,
                    selectedRoute?.id === item.id && styles.routeItemSelected,
                  ]}>
                    <TouchableOpacity
                      style={styles.routeItemMain}
                      onPress={() => handleRouteSelect(item)}
                    >
                      <View style={[
                        styles.routeItemIcon,
                        selectedRoute?.id === item.id && styles.routeItemIconSelected,
                        { borderLeftColor: getRouteColor(index), borderLeftWidth: 4 }
                      ]}>
                        <Ionicons
                          name="git-branch"
                          size={24}
                          color={selectedRoute?.id === item.id ? '#fff' : '#1a73e8'}
                        />
                      </View>
                      <View style={styles.routeItemInfo}>
                        <View style={styles.routeItemHeader}>
                          <Text
                            style={[
                              styles.routeItemCode,
                              selectedRoute?.id === item.id && styles.textWhite,
                            ]}
                          >
                            {item.code}
                          </Text>
                          {item.waypoints && item.waypoints.length > 0 && (
                            <View style={styles.pathBadge}>
                              <Ionicons name="checkmark-circle" size={12} color="#4caf50" />
                              <Text style={styles.pathBadgeText}>Path Set</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.routeItemName,
                            selectedRoute?.id === item.id && styles.textWhite,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <View style={styles.fareRow}>
                          <Text style={[
                            styles.fareLabel,
                            selectedRoute?.id === item.id && styles.textWhiteLight,
                          ]}>
                            Regular: ₱{item.fare_base?.toFixed(2)}
                          </Text>
                          <Text style={[
                            styles.fareLabel,
                            selectedRoute?.id === item.id && styles.textWhiteLight,
                          ]}>
                            Student: ₱{item.fare_student?.toFixed(2) || '10.00'}
                          </Text>
                        </View>
                      </View>
                      {selectedRoute?.id === item.id && (
                        <Ionicons name="checkmark-circle" size={28} color="#fff" />
                      )}
                    </TouchableOpacity>
                    <View style={styles.routeItemActions}>
                      <TouchableOpacity
                        style={[
                          styles.routeActionButton,
                          selectedRoute?.id === item.id && styles.routeActionButtonSelected
                        ]}
                        onPress={() => {
                          setShowRouteModal(false);
                          setTimeout(() => startRecording(item), 300);
                        }}
                      >
                        <Ionicons
                          name="navigate"
                          size={18}
                          color={selectedRoute?.id === item.id ? '#fff' : '#e53935'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.routeActionButton,
                          selectedRoute?.id === item.id && styles.routeActionButtonSelected
                        ]}
                        onPress={() => handleEditFares(item)}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={18}
                          color={selectedRoute?.id === item.id ? '#fff' : '#1a73e8'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.routeList}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={
                  <TouchableOpacity 
                    style={styles.createCustomButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowRouteModal(false);
                      setTimeout(() => {
                        setShowCreateModal(true);
                      }, Platform.OS === 'ios' ? 500 : 100);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#1a73e8" />
                    <Text style={styles.createCustomText}>Create Custom Route</Text>
                  </TouchableOpacity>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Create Route Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Custom Route</Text>
                <Text style={styles.modalSubtitle}>Set up your route with fares</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>Route Information</Text>
              
              <Text style={styles.label}>Route Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Antipolo - Pasig"
                value={newRoute.name}
                onChangeText={(text) => setNewRoute({...newRoute, name: text})}
              />

              <Text style={styles.label}>Route Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ANT-PSG"
                autoCapitalize="characters"
                value={newRoute.code}
                onChangeText={(text) => setNewRoute({...newRoute, code: text})}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Briefly describe the route path..."
                multiline
                numberOfLines={3}
                value={newRoute.description}
                onChangeText={(text) => setNewRoute({...newRoute, description: text})}
              />

              <Text style={styles.sectionTitle}>Fare Settings (₱)</Text>
              
              <View style={styles.fareInputRow}>
                <View style={styles.fareInputGroup}>
                  <Text style={styles.fareInputLabel}>
                    <Ionicons name="person" size={14} color="#666" /> Regular
                  </Text>
                  <TextInput
                    style={styles.fareInput}
                    placeholder="13.00"
                    keyboardType="decimal-pad"
                    value={newRoute.fare_base}
                    onChangeText={(text) => setNewRoute({...newRoute, fare_base: text})}
                  />
                </View>
                <View style={styles.fareInputGroup}>
                  <Text style={styles.fareInputLabel}>
                    <Ionicons name="school" size={14} color="#666" /> Student
                  </Text>
                  <TextInput
                    style={styles.fareInput}
                    placeholder="10.00"
                    keyboardType="decimal-pad"
                    value={newRoute.fare_student}
                    onChangeText={(text) => setNewRoute({...newRoute, fare_student: text})}
                  />
                </View>
              </View>

              <View style={styles.fareInputRow}>
                <View style={styles.fareInputGroup}>
                  <Text style={styles.fareInputLabel}>
                    <Ionicons name="heart" size={14} color="#666" /> Senior
                  </Text>
                  <TextInput
                    style={styles.fareInput}
                    placeholder="10.00"
                    keyboardType="decimal-pad"
                    value={newRoute.fare_senior}
                    onChangeText={(text) => setNewRoute({...newRoute, fare_senior: text})}
                  />
                </View>
                <View style={styles.fareInputGroup}>
                  <Text style={styles.fareInputLabel}>
                    <Ionicons name="accessibility" size={14} color="#666" /> PWD
                  </Text>
                  <TextInput
                    style={styles.fareInput}
                    placeholder="10.00"
                    keyboardType="decimal-pad"
                    value={newRoute.fare_pwd}
                    onChangeText={(text) => setNewRoute({...newRoute, fare_pwd: text})}
                  />
                </View>
              </View>

              <Text style={styles.helperText}>
                Your current location will be set as the starting point.
              </Text>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleCreateRoute}
              >
                <Text style={styles.saveButtonText}>Save and Select Route</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Fares Modal */}
      <Modal
        visible={showFareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fareModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Fares</Text>
                <Text style={styles.modalSubtitle}>{selectedRoute?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFareModal(false)} style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              <View style={styles.fareCard}>
                <View style={styles.fareCardIcon}>
                  <Ionicons name="person" size={24} color="#1a73e8" />
                </View>
                <View style={styles.fareCardContent}>
                  <Text style={styles.fareCardLabel}>Regular Fare</Text>
                  <Text style={styles.fareCardDesc}>Standard passenger rate</Text>
                </View>
                <View style={styles.fareCardInput}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.fareCardInputField}
                    keyboardType="decimal-pad"
                    value={editFares.fare_base}
                    onChangeText={(text) => setEditFares({...editFares, fare_base: text})}
                  />
                </View>
              </View>

              <View style={styles.fareCard}>
                <View style={[styles.fareCardIcon, { backgroundColor: '#e8f5e9' }]}>
                  <Ionicons name="school" size={24} color="#4CAF50" />
                </View>
                <View style={styles.fareCardContent}>
                  <Text style={styles.fareCardLabel}>Student Fare</Text>
                  <Text style={styles.fareCardDesc}>With valid student ID</Text>
                </View>
                <View style={styles.fareCardInput}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.fareCardInputField}
                    keyboardType="decimal-pad"
                    value={editFares.fare_student}
                    onChangeText={(text) => setEditFares({...editFares, fare_student: text})}
                  />
                </View>
              </View>

              <View style={styles.fareCard}>
                <View style={[styles.fareCardIcon, { backgroundColor: '#fff3e0' }]}>
                  <Ionicons name="heart" size={24} color="#FF9800" />
                </View>
                <View style={styles.fareCardContent}>
                  <Text style={styles.fareCardLabel}>Senior Citizen</Text>
                  <Text style={styles.fareCardDesc}>60 years old and above</Text>
                </View>
                <View style={styles.fareCardInput}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.fareCardInputField}
                    keyboardType="decimal-pad"
                    value={editFares.fare_senior}
                    onChangeText={(text) => setEditFares({...editFares, fare_senior: text})}
                  />
                </View>
              </View>

              <View style={styles.fareCard}>
                <View style={[styles.fareCardIcon, { backgroundColor: '#e3f2fd' }]}>
                  <Ionicons name="accessibility" size={24} color="#2196F3" />
                </View>
                <View style={styles.fareCardContent}>
                  <Text style={styles.fareCardLabel}>PWD Fare</Text>
                  <Text style={styles.fareCardDesc}>With valid PWD ID</Text>
                </View>
                <View style={styles.fareCardInput}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.fareCardInputField}
                    keyboardType="decimal-pad"
                    value={editFares.fare_pwd}
                    onChangeText={(text) => setEditFares({...editFares, fare_pwd: text})}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.saveButton, isSavingFares && styles.saveButtonDisabled]}
                onPress={handleSaveFares}
                disabled={isSavingFares}
              >
                {isSavingFares ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Fares</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6c757d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  driverMarkerActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#4CAF50',
  },
  driverMarkerRecording: {
    backgroundColor: '#e53935',
    borderColor: '#fff',
  },
  routeMarker: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  recordingBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 20,
    right: 20,
    backgroundColor: '#e53935',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  recordingText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stopRecordingButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  statusOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 20,
    right: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  statusCardActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1557b0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9e9e9e',
    marginRight: 12,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  statusTextActive: {
    color: '#fff',
  },
  routeCodeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  routeCodeTextActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  routeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  routeNameActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  liveIndicator: {
    backgroundColor: '#e53935',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  routeButtonContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 170 : 130,
    left: 20,
    right: 20,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  routeButtonSelected: {
    backgroundColor: '#1a73e8',
    borderColor: '#1557b0',
  },
  routeButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a73e8',
    marginLeft: 10,
  },
  routeButtonTextSelected: {
    color: '#fff',
  },
  centerButton: {
    position: 'absolute',
    right: 20,
    bottom: 180,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  actionButton: {
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#e53935',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  routeList: {
    padding: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  routeItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  routeItemSelected: {
    backgroundColor: '#1a73e8',
    borderColor: '#1557b0',
  },
  routeItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 115, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  routeItemIconSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  routeItemInfo: {
    flex: 1,
  },
  routeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeItemCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a73e8',
  },
  routeItemFare: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  routeItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  routeItemDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  fareRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  fareLabel: {
    fontSize: 12,
    color: '#666',
  },
  routeItemActions: {
    flexDirection: 'column',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  routeActionButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  routeActionButtonSelected: {
    borderLeftColor: 'rgba(255,255,255,0.3)',
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  pathBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  pathBadgeText: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '600',
  },
  textWhite: {
    color: '#fff',
  },
  textWhiteLight: {
    color: 'rgba(255,255,255,0.8)',
  },
  createCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1a73e8',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  createCustomText: {
    marginLeft: 8,
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: '600',
  },
  formContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#1a73e8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
    marginBottom: 15,
  },
  fareInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fareInputGroup: {
    flex: 1,
  },
  fareInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  fareInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },
  fareModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fareCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fareCardContent: {
    flex: 1,
  },
  fareCardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  fareCardDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  fareCardInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  fareCardInputField: {
    width: 60,
    fontSize: 16,
    fontWeight: '600',
    padding: 10,
    textAlign: 'right',
  },
});
