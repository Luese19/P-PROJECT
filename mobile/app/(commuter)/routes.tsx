import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocationStore, Route } from '../../src/store/locationStore';
import { API_URL } from '../../src/config';

export default function RoutesScreen() {
  const { routes, setRoutes, subscribedRouteId, subscribeToRoute } = useLocationStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/routes`);
      const data = await response.json();
      if (data.success) {
        setRoutes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
  };

  const handleRouteSelect = (route: Route) => {
    subscribeToRoute(route.id);
  };

  const renderRoute = ({ item }: { item: Route }) => {
    const isSelected = subscribedRouteId === item.id;

    return (
      <TouchableOpacity
        style={[styles.routeCard, isSelected && styles.routeCardSelected]}
        onPress={() => handleRouteSelect(item)}
      >
        <View style={styles.routeHeader}>
          <View style={[styles.routeIcon, isSelected && styles.routeIconSelected]}>
            <Ionicons
              name="git-branch"
              size={24}
              color={isSelected ? '#fff' : '#1a73e8'}
            />
          </View>
          <View style={styles.routeInfo}>
            <Text style={[styles.routeCode, isSelected && styles.textSelected]}>
              {item.code}
            </Text>
            <Text style={[styles.routeName, isSelected && styles.textSelected]}>
              {item.name}
            </Text>
            {item.description && (
              <Text style={[styles.routeDescription, isSelected && styles.textSelectedLight]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          )}
        </View>
        
        {/* Fare Information */}
        <View style={[styles.fareContainer, isSelected && styles.fareContainerSelected]}>
          <Text style={[styles.fareTitle, isSelected && styles.textSelectedLight]}>
            <Ionicons name="cash-outline" size={14} /> Fare Rates
          </Text>
          <View style={styles.fareGrid}>
            <View style={styles.fareItem}>
              <View style={[styles.fareIconBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#e8f0fe' }]}>
                <Ionicons name="person" size={16} color={isSelected ? '#fff' : '#1a73e8'} />
              </View>
              <Text style={[styles.fareType, isSelected && styles.textSelectedLight]}>Regular</Text>
              <Text style={[styles.fareAmount, isSelected && styles.textSelected]}>
                ₱{item.fare_base?.toFixed(2) || '13.00'}
              </Text>
            </View>
            <View style={styles.fareItem}>
              <View style={[styles.fareIconBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#e8f5e9' }]}>
                <Ionicons name="school" size={16} color={isSelected ? '#fff' : '#4CAF50'} />
              </View>
              <Text style={[styles.fareType, isSelected && styles.textSelectedLight]}>Student</Text>
              <Text style={[styles.fareAmount, isSelected && styles.textSelected]}>
                ₱{item.fare_student?.toFixed(2) || '10.00'}
              </Text>
            </View>
            <View style={styles.fareItem}>
              <View style={[styles.fareIconBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#fff3e0' }]}>
                <Ionicons name="heart" size={16} color={isSelected ? '#fff' : '#FF9800'} />
              </View>
              <Text style={[styles.fareType, isSelected && styles.textSelectedLight]}>Senior</Text>
              <Text style={[styles.fareAmount, isSelected && styles.textSelected]}>
                ₱{item.fare_senior?.toFixed(2) || '10.00'}
              </Text>
            </View>
            <View style={styles.fareItem}>
              <View style={[styles.fareIconBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#e3f2fd' }]}>
                <Ionicons name="accessibility" size={16} color={isSelected ? '#fff' : '#2196F3'} />
              </View>
              <Text style={[styles.fareType, isSelected && styles.textSelectedLight]}>PWD</Text>
              <Text style={[styles.fareAmount, isSelected && styles.textSelected]}>
                ₱{item.fare_pwd?.toFixed(2) || '10.00'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading routes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select a Route</Text>
        <Text style={styles.headerSubtitle}>
          Choose a jeepney route to track in real-time
        </Text>
      </View>

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        renderItem={renderRoute}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1a73e8']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No routes available</Text>
            <Text style={styles.emptySubtext}>Pull to refresh</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  routeCardSelected: {
    backgroundColor: '#1a73e8',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  routeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  routeInfo: {
    flex: 1,
  },
  routeCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  routeName: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  routeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  fareContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  fareContainerSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  fareTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  fareGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fareItem: {
    alignItems: 'center',
    flex: 1,
  },
  fareIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fareType: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  fareAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  textSelected: {
    color: '#fff',
  },
  textSelectedLight: {
    color: 'rgba(255,255,255,0.8)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
