# 📱 SPRINT PLAN: Mobile App (React Native)

**Duration:** 6 weeks  
**Timeline:** Week 1-6  
**Target:** iOS + Android app via Expo  
**Total Files:** 45  
**Total Tests:** 210+  
**Lines of Code:** 5,000+

---

## 📋 Overview

Build a React Native mobile app using Expo that shares code with web frontend. Focus on:
- Native feel (bottom tab navigation)
- Offline sync capability
- Firebase FCM push notifications
- Deep linking for affiliate URLs
- App-specific analytics

---

## 🗓️ WEEK 1-2: Foundation & Navigation

### Sprint Goal
Set up mobile project structure, navigation, and basic services.

### Files to Create (12)

#### 1. Project Setup
```
mobile/
├── package.json
├── app.config.js
├── babel.config.js
├── tsconfig.json
├── .env.example
├── .gitignore
└── eas.json (for building APK/IPA)
```

**File: mobile/package.json**
```json
{
  "name": "suplilist-mobile",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "eject": "expo eject",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "expo": "^49.0.0",
    "expo-router": "^2.0.0",
    "react": "^18.2.0",
    "react-native": "0.72.0",
    "react-native-safe-area-context": "^4.6.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "firebase": "^10.0.0",
    "axios": "^1.5.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "zustand": "^4.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.2.0",
    "jest": "^29.7.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.1.0"
  }
}
```

**File: mobile/app.config.js**
```javascript
export default {
  expo: {
    name: "SupliList",
    slug: "suplilist",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTabletMode: true,
      infoPlist: {
        NSLocalNetworkUsageDescription: "This app uses local network for syncing",
        NSBonjourServiceTypes: ["_suplilist._tcp"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: ["INTERNET", "CAMERA"]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-notifications",
        {
          sounds: ["default"],
          icon: "./assets/notification-icon.png",
          color: "#ffffff"
        }
      ]
    ],
    scheme: "suplilist"
  }
};
```

#### 2. Navigation Setup
```typescript
// mobile/src/navigation/RootNavigator.tsx (150 lines)

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

// Screens
import HomeScreen from '../screens/HomeScreen';
import ListsScreen from '../screens/ListsScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Icons (using react-native-vector-icons or similar)
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

// Deep linking configuration
const linking = {
  prefixes: ['suplilist://', 'https://suplilist.app'],
  config: {
    screens: {
      Home: '/',
      Lists: '/lists',
      Search: '/search',
      Product: '/product/:id',
      Affiliate: '/out/:productId',
      Profile: '/profile/:userId',
      Settings: '/settings'
    }
  }
};

export function RootNavigator() {
  return (
    <NavigationContainer linking={linking} fallback={<LoadingScreen />}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName = 'home';
            
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Lists') iconName = focused ? 'list' : 'list-outline';
            else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF6B6B',
          tabBarInactiveTintColor: '#999999'
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Home' }}
        />
        <Tab.Screen 
          name="Lists" 
          component={ListsScreen}
          options={{ title: 'My Lists' }}
        />
        <Tab.Screen 
          name="Search" 
          component={SearchScreen}
          options={{ title: 'Search' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

#### 3. Services Setup

**File: mobile/src/services/api.client.ts (200 lines)**
```typescript
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000
    });

    // Add auth interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('authToken');
          // Navigate to login
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string) {
    return this.client.get<T>(url);
  }

  async post<T>(url: string, data?: any) {
    return this.client.post<T>(url, data);
  }

  async put<T>(url: string, data?: any) {
    return this.client.put<T>(url, data);
  }

  async delete<T>(url: string) {
    return this.client.delete<T>(url);
  }
}

export const apiClient = new ApiClient();
```

**File: mobile/src/services/firebase-mobile.service.ts (250 lines)**
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function initializeFCM() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permissions');
      return;
    }

    // Get FCM token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push notification token:', token);

    return token;
  } else {
    console.warn('Must use physical device for push notifications');
  }
}

export function registerNotificationListeners() {
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification clicked:', response);
    // Handle deep linking here
    const data = response.notification.request.content.data;
    if (data.productId) {
      // Navigate to product screen
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
```

**File: mobile/src/services/storage.service.ts (150 lines)**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageKeys {
  authToken: string;
  userId: string;
  userPreferences: Record<string, any>;
  cachedLists: string;
  cachedProducts: string;
  offlineSyncQueue: string;
}

class StorageService {
  async set<T>(key: keyof StorageKeys, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      await AsyncStorage.setItem(key, json);
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
    }
  }

  async get<T>(key: keyof StorageKeys, defaultValue?: T): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue ?? null;
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return defaultValue ?? null;
    }
  }

  async remove(key: keyof StorageKeys): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}

export const storageService = new StorageService();
```

**File: mobile/src/services/deep-linking.service.ts (100 lines)**
```typescript
import * as Linking from 'expo-linking';

export async function handleDeepLink(url: string) {
  const parsed = Linking.parse(url);
  
  const { hostname, path, queryParams } = parsed;

  if (path === '/product' && queryParams?.id) {
    // Navigate to product detail
    return { screen: 'Product', params: { id: queryParams.id } };
  }

  if (path === '/out' && queryParams?.productId) {
    // Handle affiliate link
    return { screen: 'AffiliateCheckout', params: { productId: queryParams.productId } };
  }

  if (path === '/profile' && queryParams?.userId) {
    // Navigate to user profile
    return { screen: 'Profile', params: { userId: queryParams.userId } };
  }

  return null;
}

export function initializeDeepLinking(navigate: any) {
  const handleUrl = ({ url }: { url: string }) => {
    const deepLink = handleDeepLink(url);
    if (deepLink) {
      navigate(deepLink.screen, deepLink.params);
    }
  };

  const subscription = Linking.addEventListener('url', handleUrl);

  return () => subscription.remove();
}
```

#### 4. Basic Screens

**File: mobile/src/screens/HomeScreen.tsx (150 lines)**
```typescript
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { apiClient } from '../services/api.client';

export default function HomeScreen({ navigation }: any) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await apiClient.get('/api/products?limit=10');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Featured Products</Text>
      {/* Product cards will go here */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16
  }
});
```

**File: mobile/src/screens/ListsScreen.tsx (100 lines)**
```typescript
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { apiClient } from '../services/api.client';

export default function ListsScreen() {
  const [lists, setLists] = useState([]);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const response = await apiClient.get('/api/lists');
      setLists(response.data.data);
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listTitle}>{item.name}</Text>
            <Text style={styles.itemCount}>{item.items_count} items</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  itemCount: {
    fontSize: 14,
    color: '#999',
    marginTop: 4
  }
});
```

**Similar files needed:**
- `mobile/src/screens/SearchScreen.tsx`
- `mobile/src/screens/ProfileScreen.tsx`
- `mobile/src/screens/SettingsScreen.tsx`
- `mobile/src/screens/LoadingScreen.tsx`

#### 5. Tests (Week 1-2)

**File: mobile/src/__tests__/navigation.test.tsx (50 tests)**
```typescript
import { render } from '@testing-library/react-native';
import { RootNavigator } from '../navigation/RootNavigator';

describe('Navigation', () => {
  test('renders root navigator', () => {
    const { getByText } = render(<RootNavigator />);
    expect(getByText('Home')).toBeTruthy();
  });

  test('bottom tabs visible', () => {
    const { getByLabelText } = render(<RootNavigator />);
    expect(getByLabelText(/home/i)).toBeTruthy();
    expect(getByLabelText(/lists/i)).toBeTruthy();
    expect(getByLabelText(/search/i)).toBeTruthy();
  });

  // 47 more tests...
});
```

**File: mobile/src/__tests__/api-client.test.ts (30 tests)**
```typescript
import { apiClient } from '../services/api.client';

describe('ApiClient', () => {
  test('makes GET requests', async () => {
    // Mock axios
    const response = await apiClient.get('/test');
    expect(response.status).toBe(200);
  });

  // 29 more tests...
});
```

**File: mobile/src/__tests__/storage.test.ts (25 tests)**
```typescript
import { storageService } from '../services/storage.service';

describe('StorageService', () => {
  test('stores and retrieves data', async () => {
    await storageService.set('userPreferences', { theme: 'dark' });
    const data = await storageService.get('userPreferences');
    expect(data.theme).toBe('dark');
  });

  // 24 more tests...
});
```

### Checklist for Week 1-2
- [ ] Project initialized with Expo
- [ ] Navigation setup (bottom tabs)
- [ ] All 5 main screens created (empty)
- [ ] API client working
- [ ] Firebase FCM initialized
- [ ] AsyncStorage service working
- [ ] Deep linking configured
- [ ] All 75+ tests passing
- [ ] Can run `expo start`
- [ ] Can navigate between tabs

---

## 🎨 WEEK 3-4: Feature Implementation

### Sprint Goal
Implement core features: lists, search, product details, price comparison, affiliate checkout.

### Files to Create (18)

#### Screens with Features

**File: mobile/src/screens/ListDetailScreen.tsx (300 lines)**
- View list items
- Edit list name/description
- Add/remove items
- Share list
- Delete list

**File: mobile/src/screens/ProductDetailScreen.tsx (250 lines)**
- Product info (title, description, image)
- Price across 3 marketplaces
- Reviews & rating
- Related products
- "Add to list" button

**File: mobile/src/screens/ComparisonScreen.tsx (200 lines)**
- Compare 2-3 products side by side
- Price history chart
- Reviews for each
- Best deal indicator

**File: mobile/src/screens/AffiliateCheckoutScreen.tsx (150 lines)**
- Show affiliate link
- "Buy now" button (opens marketplace URL)
- Track click
- Show commission info

#### Reusable Components

**File: mobile/src/components/ProductCard.tsx (120 lines)**
```typescript
interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: product.image }}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.minPrice}>From ${product.min_price}</Text>
          <Text style={styles.sourceCount}>{product.sources_count} sources</Text>
        </View>
        <Rating value={product.rating} readonly />
      </View>
    </TouchableOpacity>
  );
}
```

**File: mobile/src/components/PriceComparison.tsx (150 lines)**
- Show prices from Amazon, Shopee, Mercado Livre
- Highlight cheapest
- "Buy" button for each

**File: mobile/src/components/PriceAlertBadge.tsx (80 lines)**
- Show price drop badge
- Notify user of deal

**File: mobile/src/components/AffiliateButton.tsx (100 lines)**
- "Buy on X" button
- Open marketplace URL
- Track click

#### Services

**File: mobile/src/services/list.service.ts (200 lines)**
```typescript
export async function getList(listId: string) {
  return apiClient.get(`/api/lists/${listId}`);
}

export async function createList(name: string, description: string) {
  return apiClient.post('/api/lists', { name, description });
}

export async function updateList(listId: string, updates: any) {
  return apiClient.put(`/api/lists/${listId}`, updates);
}

export async function deleteList(listId: string) {
  return apiClient.delete(`/api/lists/${listId}`);
}

export async function addItemToList(listId: string, productId: string) {
  return apiClient.post(`/api/lists/${listId}/items`, { productId });
}

export async function removeItemFromList(listId: string, itemId: string) {
  return apiClient.delete(`/api/lists/${listId}/items/${itemId}`);
}
```

**File: mobile/src/services/product.service.ts (180 lines)**
```typescript
export async function searchProducts(query: string, limit = 20) {
  return apiClient.get(`/api/products/search?q=${query}&limit=${limit}`);
}

export async function getProduct(productId: string) {
  return apiClient.get(`/api/products/${productId}`);
}

export async function getProductPrices(productId: string) {
  return apiClient.get(`/api/products/${productId}/prices`);
}

export async function getPriceHistory(productId: string, days = 30) {
  return apiClient.get(`/api/products/${productId}/price-history?days=${days}`);
}

export async function getRelatedProducts(productId: string) {
  return apiClient.get(`/api/products/${productId}/related`);
}
```

**File: mobile/src/services/affiliate.service.ts (150 lines)**
```typescript
export async function getAffiliateLink(productId: string, source: string) {
  return apiClient.post('/api/affiliate/out', {
    url: `https://example.com/product/${productId}`,
    source
  });
}

export async function trackAffiliateClick(productId: string, source: string) {
  return apiClient.post('/api/analytics/affiliate-click', {
    productId,
    source
  });
}
```

#### Custom Hooks

**File: mobile/src/hooks/useProductSearch.ts (80 lines)**
```typescript
export function useProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useMemo(
    () => debounce(async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await searchProducts(q);
        setResults(response.data.data);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  const handleSearch = (q: string) => {
    setQuery(q);
    debouncedSearch(q);
  };

  return { query, results, loading, handleSearch };
}
```

**File: mobile/src/hooks/useUserLists.ts (100 lines)**
**File: mobile/src/hooks/usePriceAlerts.ts (80 lines)**
**File: mobile/src/hooks/useOfflineSync.ts (120 lines)**

#### Tests (Week 3-4)

**File: mobile/src/__tests__/screens.test.tsx (40 tests)**
- Test screen rendering
- Test navigation between screens
- Test data loading

**File: mobile/src/__tests__/components.test.tsx (40 tests)**
- Test ProductCard rendering
- Test PriceComparison display
- Test AffiliateButton

### Checklist for Week 3-4
- [ ] All screens functional
- [ ] List CRUD working
- [ ] Search working
- [ ] Product details showing
- [ ] Price comparison displaying
- [ ] Affiliate checkout working
- [ ] All components rendering correctly
- [ ] 80+ tests passing
- [ ] App responsive on different screen sizes

---

## ✨ WEEK 5-6: Polish, Notifications & Deploy

### Sprint Goal
Polish UI, implement push notifications, offline sync, performance optimization, and prepare for deployment.

### Files to Create (15)

#### Push Notifications

**File: mobile/src/services/push-notification-handler.ts (150 lines)**
- Handle FCM notifications
- Navigate to relevant screen
- Update badges

**File: mobile/src/screens/NotificationsScreen.tsx (150 lines)**
- Show notification history
- Mark as read
- Delete notifications

**File: mobile/src/components/NotificationBanner.tsx (80 lines)**
- In-app notification banner
- Auto-dismiss

#### Offline Sync

**File: mobile/src/services/offline-queue.service.ts (200 lines)**
```typescript
class OfflineQueue {
  private queue: QueueItem[] = [];

  async addToQueue(action: any) {
    this.queue.push({
      id: generateId(),
      action,
      timestamp: Date.now()
    });
    await this.saveQueue();
  }

  async syncWhenOnline() {
    if (!isOnline()) return;

    for (const item of this.queue) {
      try {
        await executeAction(item.action);
        await this.removeFromQueue(item.id);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }

  private async saveQueue() {
    await storageService.set('offlineSyncQueue', this.queue);
  }
}

export const offlineQueue = new OfflineQueue();
```

**File: mobile/src/services/sync-manager.ts (150 lines)**
- Background sync when online
- Conflict resolution
- Retry logic

#### Performance

**File: mobile/src/utils/image-optimization.ts (100 lines)**
```typescript
export function optimizeImageUri(uri: string, width: number, height: number) {
  // Resize images for mobile
  return `${uri}?w=${width}&h=${height}&q=80`;
}
```

**File: mobile/src/utils/bundle-optimization.ts (80 lines)**
- Code splitting guidance
- Lazy loading

#### Theme & UI Polish

**File: mobile/src/theme/colors.ts (50 lines)**
```typescript
export const colors = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#ECF0F1',
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C'
};
```

**File: mobile/src/theme/typography.ts (40 lines)**

**File: mobile/src/utils/animations.ts (80 lines)**
- Smooth transitions
- Fade in/out
- Slide animations

#### Testing

**File: mobile/src/__tests__/e2e.test.tsx (80 tests)**
```typescript
describe('Complete E2E Flows', () => {
  test('user can create list and add products', async () => {
    // Full flow test
  });

  test('offline mode syncs when online', async () => {
    // Offline sync test
  });

  // 78 more tests...
});
```

**File: mobile/performance.benchmark.ts (40 tests)**
- Measure app cold start
- Measure navigation transitions
- Measure list rendering performance

#### Documentation

**File: docs/MOBILE_APP_SETUP.md (200 lines)**
- How to setup Expo
- How to run Android/iOS
- How to build APK/IPA
- How to use EAS Build

**File: docs/MOBILE_ARCHITECTURE.md (300 lines)**
- Architecture overview
- File structure
- Services explanation
- State management approach

**File: MOBILE_BUILD_GUIDE.md (200 lines)**
- Build for iOS (EAS)
- Build for Android (EAS)
- Sign certificates
- Submit to stores (optional)

#### Deployment Setup

**File: eas.json**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "production": {
      "node": "18.0.0",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.suplilist.app"
      }
    },
    "preview": {
      "distribution": "internal"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_ID"
      },
      "android": {
        "serviceAccount": "./path/to/service-account.json"
      }
    }
  }
}
```

### Checklist for Week 5-6
- [ ] Push notifications working
- [ ] Offline mode working
- [ ] Performance benchmarks met (<3s cold start)
- [ ] UI fully polished
- [ ] All 80+ E2E tests passing
- [ ] Documentation complete
- [ ] EAS Build configured
- [ ] Ready for App Store / Play Store submission

---

## 📊 Summary

**Total Files:** 45  
**Total Tests:** 210+  
**Total Lines:** 5,000+  
**Time:** 6 weeks

### Key Deliverables
✅ iOS + Android app  
✅ Bottom tab navigation  
✅ Full feature set (lists, search, products, affiliate)  
✅ Push notifications  
✅ Offline sync  
✅ Performance optimized  
✅ 210+ tests  
✅ Ready for production

### Commands to Run
```bash
# Setup
expo init suplilist-mobile --npm
cd mobile
npm install

# Development
npm start
npm run android
npm run ios

# Build
npm run build:android
npm run build:ios

# Testing
npm test
npm run test:watch
```

---

**Next:** Move to SPRINT_PLAN_SOCIAL_FEATURES.md
