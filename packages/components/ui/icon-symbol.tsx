// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: Record<string, ComponentProps<typeof MaterialIcons>["name"]> = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "mic.fill": "mic",
  "gearshape.fill": "settings",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "waveform": "graphic-eq",
  "doc.text.fill": "description",
  "text.bubble.fill": "chat",
  "star.fill": "star",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "magnifyingglass": "search",
  "xmark": "close",
  "checkmark": "check",
  "plus": "add",
  "minus": "remove",
  "arrow.left": "arrow-back",
  "clock.fill": "schedule",
  "folder.fill": "folder",
  "info.circle.fill": "info",
  "exclamationmark.triangle.fill": "warning",
  "face.smiling": "mood",
  "face.dashed": "sentiment-neutral",
  "face.frowning": "mood-bad",
  "square.grid.2x2": "grid-view",
  "list.bullet": "view-list",
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
