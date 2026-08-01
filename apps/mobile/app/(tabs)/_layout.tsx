import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";

/**
 * Alt navigasyon. Web'deki BottomTabBar ile aynı bilgi mimarisi.
 *
 * Kurye sekmeleri YALNIZCA onaylı kuryeye gösterilir. Bu bir kolaylık;
 * asıl koruma sunucudadır — her uç yetkiyi ayrıca doğrular.
 * Admin mobilde HİÇ görünmez (ayrı korumalı web yüzeyi).
 */
export default function TabsLayout() {
  const [courierApproved, setCourierApproved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = await api.me();
        setCourierApproved(me.courier.approved);
      } catch {
        // Oturum/ağ sorunu: kurye sekmeleri gizli kalır (güvenli taraf).
        setCourierApproved(false);
      }
    })();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: "#B6C0CE",
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.line,
          height: 88,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana sayfa",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shipments"
        options={{
          title: "Gönderiler",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "İşler",
          href: courierApproved ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Cüzdan",
          href: courierApproved ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
