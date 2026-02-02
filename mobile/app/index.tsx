import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Redirect, Link } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Redirect based on auth state and role
  if (isAuthenticated && user) {
    if (user.role === 'driver') {
      return <Redirect href="/(driver)/map" />;
    }
    return <Redirect href="/(commuter)/map" />;
  }

  // Show welcome screen for unauthenticated users
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bus" size={80} color="#1a73e8" />
        <Text style={styles.title}>Jeep-Track</Text>
        <Text style={styles.subtitle}>Real-time Jeepney Tracking</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="location" size={24} color="#1a73e8" />
          <Text style={styles.featureText}>Track jeepneys in real-time</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="time" size={24} color="#1a73e8" />
          <Text style={styles.featureText}>Get ETA for your destination</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="navigate" size={24} color="#1a73e8" />
          <Text style={styles.featureText}>Find nearby jeepneys</Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(auth)/signup" asChild>
          <TouchableOpacity style={styles.signupButton}>
            <Text style={styles.signupButtonText}>Create Account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a73e8',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  features: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f8ff',
    borderRadius: 12,
  },
  featureText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
  buttons: {
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#1a73e8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a73e8',
  },
  signupButtonText: {
    color: '#1a73e8',
    fontSize: 18,
    fontWeight: '600',
  },
});
