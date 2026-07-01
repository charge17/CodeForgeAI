import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { isPipelineRunning } = useApp();

  const tabBarHeight = Platform.select({ ios: insets.bottom + 60, android: 68, default: 68 });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: 8, default: 8 }),
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="autodev"
        options={{
          title: 'Auto Dev',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialCommunityIcons name="rocket-launch" size={size} color={color} />
              {isPipelineRunning && (
                <View style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.running,
                }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Graph',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sitemap" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="browser"
        options={{
          title: 'Browser',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialCommunityIcons name="web" size={size} color={color} />
              {isPipelineRunning && (
                <View style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning,
                }} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: 'Workspace',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="code-braces" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="checkbox-marked-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bookshelf" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
