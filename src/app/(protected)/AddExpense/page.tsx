import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext";
import { supabase } from "@/supabaseClient";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { Picker } from "@react-native-picker/picker";
import MapView, { Marker } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const SPACING = width * 0.04;

const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY;
const TRANSACTION_TYPES = ["expense", "income"];
const CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Lazer",
  "Moradia",
  "Saúde",
  "Educação",
  "Compras",
  "Salário",
  "Outra",
];

interface Coordinates {
  latitude: number;
  longitude: number;
}

export default function AddExpenseScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<string>("expense");
  const [locationCoords, setLocationCoords] = useState<Coordinates | null>(
    null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    setShowDatePicker(Platform.OS === "ios");
    setExpenseDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "Precisamos da permissão para acessar a galeria de imagens."
      );
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "Precisamos da permissão para acessar a câmera."
      );
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    setIsFetchingLocation(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão de Localização negada",
        "Não foi possível obter a localização sem permissão."
      );
      setIsFetchingLocation(false);
      return;
    }
    try {
      let location = await Location.getCurrentPositionAsync({});
      const coords: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setLocationCoords(coords);
      Alert.alert("Localização", "Localização capturada com sucesso!");
    } catch (error: any) {
      Alert.alert(
        "Erro na Localização",
        "Não foi possível obter a localização: " + error.message
      );
      setLocationCoords(null);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const uploadImageToImgBB = async (uri: string): Promise<string | null> => {
    if (!IMGBB_API_KEY) {
      Alert.alert(
        "Erro de Configuração",
        "A chave da API do ImgBB não foi encontrada."
      );
      return null;
    }
    try {
      const base64Img = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const formData = new FormData();
      formData.append("key", IMGBB_API_KEY);
      formData.append("image", base64Img);

      const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        return result.data.url;
      } else {
        throw new Error(
          result.error?.message ||
            "Erro desconhecido ao fazer upload para o ImgBB."
        );
      }
    } catch (error: any) {
      console.error("Erro no upload para ImgBB:", error);
      Alert.alert(
        "Erro no Upload",
        "Não foi possível fazer upload da imagem: " + error.message
      );
      return null;
    }
  };

  const handleAddExpense = async () => {
    if (!user) {
      Alert.alert(
        "Erro",
        "Você precisa estar logado para adicionar uma transação."
      );
      return;
    }
    if (!description.trim() || !amount.trim()) {
      Alert.alert("Erro", "Descrição e Valor são campos obrigatórios.");
      return;
    }
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Erro", "O valor deve ser um número positivo.");
      return;
    }

    const finalCategory =
      category === "Outra" ? customCategory.trim() : category;
    if (!finalCategory) {
      Alert.alert("Erro", "A categoria é obrigatória.");
      return;
    }

    setIsAdding(true);
    let imageUrl: string | null = null;

    try {
      if (selectedImage) {
        imageUrl = await uploadImageToImgBB(selectedImage);
        if (!imageUrl) {
          setIsAdding(false);
          return;
        }
      }

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        description: description.trim(),
        amount: parsedAmount,
        category: finalCategory,
        expense_date: expenseDate.toISOString().split("T")[0],
        type: transactionType,
        location_coords: locationCoords,
        receipt_image_url: imageUrl,
      });

      if (error) {
        throw error;
      }

      Alert.alert("Sucesso", "Transação adicionada com sucesso!");

      setDescription("");
      setAmount("");
      setCategory(CATEGORIES[0]);
      setCustomCategory("");
      setExpenseDate(new Date());
      setSelectedImage(null);
      setTransactionType("expense");
      setLocationCoords(null);
      router.back();
    } catch (error: any) {
      console.error("Erro ao adicionar a transação:", error.message);
      Alert.alert(
        "Erro",
        "Não foi possível adicionar a transação: " + error.message
      );
    } finally {
      setIsAdding(false);
    }
  };

  if (authLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          Nova Transação
        </Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
          <Ionicons
            name={theme.dark ? "sunny" : "moon"}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View
            style={[
              styles.typeButtonsContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            {TRANSACTION_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  transactionType === type && {
                    backgroundColor:
                      type === "expense" ? "#E57373" : theme.colors.primary,
                  },
                ]}
                onPress={() => setTransactionType(type)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color:
                        transactionType === type ? "#fff" : theme.colors.text,
                    },
                  ]}
                >
                  {type === "expense" ? "Despesa" : "Receita"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Detalhes da Transação
          </Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={theme.colors.secondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              onChangeText={setDescription}
              value={description}
              placeholder="Ex: Almoço no trabalho"
              placeholderTextColor={theme.colors.secondary}
            />
          </View>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Ionicons
              name="cash-outline"
              size={20}
              color={theme.colors.secondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              onChangeText={setAmount}
              value={amount}
              placeholder="0,00"
              placeholderTextColor={theme.colors.secondary}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Categoria e Data
          </Text>
          <View
            style={[
              styles.pickerContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={{ color: theme.colors.text }}
              dropdownIconColor={theme.colors.text}
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
          {category === "Outra" && (
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <Ionicons
                name="duplicate-outline"
                size={20}
                color={theme.colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                onChangeText={setCustomCategory}
                value={customCategory}
                placeholder="Nome da nova categoria"
                placeholderTextColor={theme.colors.secondary}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={showDatepicker}
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={theme.colors.secondary}
              style={styles.inputIcon}
            />
            <Text
              style={[
                styles.input,
                { color: theme.colors.text, paddingTop: SPACING / 1.5 },
              ]}
            >
              {expenseDate.toLocaleDateString("pt-BR")}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={expenseDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Anexos (Opcional)
          </Text>
          <View style={styles.attachmentButtonsContainer}>
            <TouchableOpacity
              onPress={pickImage}
              style={[
                styles.attachmentButton,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <Ionicons
                name="image-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={takePhoto}
              style={[
                styles.attachmentButton,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={getLocation}
              disabled={isFetchingLocation}
              style={[
                styles.attachmentButton,
                { backgroundColor: theme.colors.background },
              ]}
            >
              {isFetchingLocation ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons
                  name="location-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.receiptImage}
            />
          )}
          {locationCoords && (
            <View>
              <Text style={styles.locationText}>
                {`Lat: ${locationCoords.latitude.toFixed(
                  4
                )}, Lon: ${locationCoords.longitude.toFixed(4)}`}
              </Text>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: locationCoords.latitude,
                  longitude: locationCoords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={locationCoords}
                  title={"Localização da Transação"}
                  pinColor={theme.colors.primary}
                />
              </MapView>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleAddExpense} disabled={isAdding}>
          <LinearGradient
            colors={
              theme.dark
                ? [theme.colors.primary, "#3a8a7c"]
                : [theme.colors.primary, "#6edace"]
            }
            style={styles.button}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Adicionar Transação</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: SPACING, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING,
    paddingTop:
      (Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0) + SPACING,
  },
  headerButton: { padding: 5 },
  headerText: { fontSize: width * 0.05, fontWeight: "bold" },
  card: {
    borderRadius: 20,
    padding: SPACING,
    marginBottom: SPACING,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: "600",
    marginBottom: SPACING,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    marginBottom: SPACING,
    paddingHorizontal: SPACING,
    height: 55,
  },
  inputIcon: { marginRight: SPACING / 2 },
  input: { flex: 1, fontSize: width * 0.04, height: "100%" },
  pickerContainer: {
    borderRadius: 15,
    marginBottom: SPACING,
    justifyContent: "center",
    height: 55,
    overflow: "hidden",
  },
  typeButtonsContainer: {
    flexDirection: "row",
    borderRadius: 15,
    overflow: "hidden",
    padding: 5,
  },
  typeButton: {
    flex: 1,
    paddingVertical: SPACING / 1.5,
    alignItems: "center",
    borderRadius: 10,
  },
  typeButtonText: { fontSize: width * 0.038, fontWeight: "bold" },
  attachmentButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING,
  },
  attachmentButton: {
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  receiptImage: {
    width: "100%",
    height: 150,
    borderRadius: 15,
    marginTop: SPACING / 2,
  },
  map: { width: "100%", height: 150, borderRadius: 15, marginTop: SPACING },
  locationText: {
    fontSize: width * 0.03,
    color: "#888",
    alignSelf: "center",
    marginTop: SPACING,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: SPACING,
    backgroundColor: "transparent",
  },
  button: {
    paddingVertical: SPACING,
    alignItems: "center",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonText: { color: "#fff", fontSize: width * 0.045, fontWeight: "bold" },
});
