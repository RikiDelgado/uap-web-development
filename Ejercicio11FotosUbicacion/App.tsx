import { useEffect, useRef, useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  Alert, 
  Image, 
  FlatList, 
  Dimensions 
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

type PhotoItem = {
  id: string;
  uri: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: number;
};

const STORAGE_KEY = "@tech_photos";

export default function App() {
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const camRef = useRef<CameraView | null>(null);

  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (camPermission && !camPermission.granted) await requestCamPermission();

        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationStatus(status === "granted" ? "granted" : "denied");

        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setPhotos(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const storePhotos = async (list: PhotoItem[]) => {
    setPhotos(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const takePhoto = async () => {
    if (!camRef.current) return;

    try {
      setCapturing(true);
      const snap = await camRef.current.takePictureAsync({ quality: 0.8, skipProcessing: true });

      let lat: number | null = null;
      let lon: number | null = null;

      if (locationStatus === "granted") {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } catch (err: any) {
          console.warn("Error ubicación:", err?.message);
        }
      }

      const newPhoto: PhotoItem = {
        id: String(Date.now()),
        uri: snap.uri,
        latitude: lat,
        longitude: lon,
        timestamp: Date.now(),
      };

      const updated = [newPhoto, ...photos];
      await storePhotos(updated);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "No se pudo capturar la foto");
    } finally {
      setCapturing(false);
    }
  };

  const clearAllPhotos = () => {
    Alert.alert("Eliminar todas", "¿Deseas borrar todas las fotos guardadas?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => await storePhotos([])
      }
    ]);
  };

  if (loading || !camPermission) {
    return (
      <View style={T.styles.centered}>
        <ActivityIndicator size="large" color="#0CF" />
        <Text style={{ marginTop: 8, color: "#888" }}>Cargando cámara...</Text>
      </View>
    );
  }

  if (!camPermission.granted) {
    return (
      <View style={T.styles.centered}>
        <Text style={{ fontWeight: "700", marginBottom: 8, color: "#0CF" }}>Se requiere permiso de cámara</Text>
        <TouchableOpacity onPress={requestCamPermission} style={T.styles.button}>
          <Text style={T.styles.buttonText}>Conceder permiso</Text>
        </TouchableOpacity>
        <Text style={T.styles.hint}>Actívalo en Ajustes → Expo Go → Cámara si lo negaste antes</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width;

  return (
    <View style={T.styles.container}>
      <View style={T.styles.cameraContainer}>
        <CameraView ref={camRef} style={T.styles.camera} facing={cameraFacing} animateShutter={false} />

        {/* Botones flotantes sobre la cámara */}
        <View style={T.styles.floatingControls}>
          <TouchableOpacity 
            onPress={() => setCameraFacing(cameraFacing === "back" ? "front" : "back")}
            style={[T.styles.floatingBtn, { left: 16 }]}
          >
            <Text style={T.styles.floatingBtnText}>↺</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={takePhoto} 
            style={[T.styles.floatingBtn, { right: 16 }]}
            disabled={capturing}
          >
            <Text style={T.styles.floatingBtnText}>{capturing ? "..." : "📷"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={T.styles.infoPanel}>
        <Text style={T.styles.permissionText}>Ubicación: {locationStatus}</Text>
        <TouchableOpacity onPress={clearAllPhotos} style={T.styles.clearButton}>
          <Text style={T.styles.clearText}>Vaciar fotos</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: "#888" }}>No hay fotos guardadas</Text>}
        renderItem={({ item }) => (
          <View style={T.styles.card}>
            <Image source={{ uri: item.uri }} style={T.styles.cardImage} />
            <View style={T.styles.cardInfo}>
              <Text style={T.styles.cardTitle}>{new Date(item.timestamp).toLocaleString()}</Text>
              <Text style={T.styles.cardSubtitle}>
                {item.latitude !== null && item.longitude !== null
                  ? `Lat: ${item.latitude.toFixed(6)} Lon: ${item.longitude.toFixed(6)}`
                  : "Sin coordenadas"}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const T = {
  styles: StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0A0F1F" },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    cameraContainer: { height: 300, margin: 12, borderRadius: 16, overflow: "hidden", backgroundColor: "#1A2233" },
    camera: { flex: 1 },
    floatingControls: { 
      position: "absolute", 
      bottom: 12, 
      width: "100%", 
      flexDirection: "row", 
      justifyContent: "space-between", 
      paddingHorizontal: 16 
    },
    floatingBtn: { 
      backgroundColor: "#0CF", 
      width: 60, 
      height: 60, 
      borderRadius: 30, 
      alignItems: "center", 
      justifyContent: "center", 
      shadowColor: "#000", 
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 3,
      elevation: 5
    },
    floatingBtnText: { fontSize: 24, color: "#fff", fontWeight: "700" },
    infoPanel: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 8 },
    permissionText: { color: "#0CF", fontWeight: "600" },
    clearButton: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#0CF" },
    clearText: { color: "#0CF", fontWeight: "700" },
    card: { backgroundColor: "#1A2233", borderRadius: 12, marginTop: 12, overflow: "hidden" },
    cardImage: { width: "100%", height: 170, backgroundColor: "#2A3550" },
    cardInfo: { padding: 12 },
    cardTitle: { color: "#0CF", fontWeight: "700", marginBottom: 4 },
    cardSubtitle: { color: "#88CFFF" },
    hint: { fontSize: 12, color: "#888", marginTop: 4, textAlign: "center" },

    // 🔹 Corrección: agregamos los estilos faltantes
    button: { 
      backgroundColor: "#0CF", 
      paddingHorizontal: 20, 
      paddingVertical: 12, 
      borderRadius: 8, 
      marginTop: 10 
    },
    buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 }
  })
};
