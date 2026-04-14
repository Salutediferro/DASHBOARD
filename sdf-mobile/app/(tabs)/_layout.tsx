import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { useHomeData } from "@/hooks/use-mock-home";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        color: focused ? colors.gold : colors.textMuted,
        fontSize: 10,
        fontFamily: "Inter_600SemiBold",
        letterSpacing: 0.5,
      }}
    >
      {label.toUpperCase()}
    </Text>
  );
}

function HomeTabIcon({ focused }: { focused: boolean }) {
  const { data } = useHomeData();
  return (
    <View>
      <TabIcon label="Home" focused={focused} />
      {data.unreadNotifications > 0 && (
        <View
          style={{
            position: "absolute",
            top: -6,
            right: -10,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.gold,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 3,
          }}
        >
          <Text style={{ color: colors.bg0, fontSize: 9, fontFamily: "Inter_700Bold" }}>
            {data.unreadNotifications}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg1,
          borderTopColor: colors.bg2,
          height: 70,
          paddingTop: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <HomeTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Workout" focused={focused} /> }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Nutrizione" focused={focused} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Progressi" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profilo" focused={focused} /> }}
      />
    </Tabs>
  );
}
