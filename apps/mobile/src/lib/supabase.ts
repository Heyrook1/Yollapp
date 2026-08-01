import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Mobil Supabase istemcisi.
 *
 * GÜVENLİK: Yalnızca ANON key kullanılır. `DATABASE_URL`, service role key ve
 * Prisma cihaza İNMEZ (ADR 0003). Veri erişimini RLS korur — mobil istemci
 * ayrıcalıklı bir yol kullanmaz.
 *
 * Oturum AsyncStorage'da saklanır; `detectSessionInUrl` native'de kapalı olmalı.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase yapılandırılmadı. apps/mobile/.env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin.",
    );
  }
  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Native'de URL tabanlı oturum algılama yok.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
