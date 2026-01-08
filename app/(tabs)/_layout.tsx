import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { GlobalRecordingBar } from "@/components/global-recording-bar";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
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
          name="index"
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
      <View style={[styles.recordingBarContainer, { bottom: tabBarHeight }]}>
        <GlobalRecordingBar />
      </View>
    </View>
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
