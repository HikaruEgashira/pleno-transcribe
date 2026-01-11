import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/packages/components/ui/icon-symbol";
import { useColors } from "@/packages/hooks/use-colors";

interface NavItem {
  route: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: "notes", label: "ノート", icon: "folder.fill" },
  { route: "record", label: "録音", icon: "mic.fill" },
  { route: "settings", label: "設定", icon: "gearshape.fill" },
];

export function SidebarNavigation() {
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const currentRoute = segments[1] || "record";

  const handleNavigate = (route: string) => {
    router.push(`/(tabs)/${route}` as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Pleno Live
        </Text>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentRoute === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              onPress={() => handleNavigate(item.route)}
              style={[
                styles.navItem,
                {
                  backgroundColor: isActive
                    ? colors.primary + "15"
                    : "transparent",
                },
              ]}
              activeOpacity={0.7}
            >
              <IconSymbol
                name={item.icon as any}
                size={22}
                color={isActive ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isActive ? colors.primary : colors.foreground,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    borderRightWidth: 1,
    paddingHorizontal: 12,
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  nav: {
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navLabel: {
    fontSize: 15,
  },
});
