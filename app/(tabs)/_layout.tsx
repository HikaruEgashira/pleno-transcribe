import { Tabs, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, StyleSheet } from "react-native";

import { HapticTab } from "@/packages/components/haptic-tab";
import { IconSymbol } from "@/packages/components/ui/icon-symbol";
import { useColors } from "@/packages/hooks/use-colors";
import { GlobalRecordingBar } from "@/packages/components/global-recording-bar";
import { RecordingSessionProvider } from "@/packages/lib/recording-session-context";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const isWebsite = segments[0] === "website";
  const isWeb = Platform.OS === "web";
  const bottomPadding = isWeb ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  // Skip RecordingSessionProvider for website route
  if (isWebsite) {
    return null;
  }

  const tabsContent = (
      <View style={styles.container}>
        <Tabs
          initialRouteName="record"
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.muted,
            headerShown: false,
            tabBarButton: HapticTab,
            tabBarStyle: {
              paddingTop: 8,
              paddingBottom: bottomPadding,
              height: tabBarHeight,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 0.5,
            },
          }}
        >
          <Tabs.Screen
            name="notes"
            options={{
              title: "ノート",
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="folder.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="record"
            options={{
              title: "録音",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={20} name="mic.fill" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "設定",
              tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
            }}
          />
        </Tabs>
        {!isWeb && (
          <View style={[styles.recordingBarContainer, { bottom: tabBarHeight }]}>
            <GlobalRecordingBar />
          </View>
        )}
      </View>
  );

  // ウェブではRecordingSessionProviderをスキップ（音声許可を求めない）
  if (isWeb) {
    return tabsContent;
  }

  return (
    <RecordingSessionProvider>
      {tabsContent}
    </RecordingSessionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recordingBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
