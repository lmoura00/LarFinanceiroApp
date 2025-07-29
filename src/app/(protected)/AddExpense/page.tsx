import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Dimensions, TextInput, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/Hooks/ThemeContext';
import { useAuth } from '@/Hooks/AuthContext';
import { supabase } from '@/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const TRANSACTION_TYPES = ['expense', 'income'];

const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Moradia',
  'Saúde',
  'Educação',
  'Compras',
  'Salário',
  'Outra',
];


interface Coordinates {
    latitude: number;
    longitude: number;
}

export default function AddExpenseScreen() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<string>('expense');
  const [locationCoords, setLocationCoords] = useState<Coordinates | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    setShowDatePicker(Platform.OS === 'ios');
    setExpenseDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos da permissão para acessar a galeria de imagens.');
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
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos da permissão para acessar a câmera.');
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
    if (status !== 'granted') {
      Alert.alert('Permissão de Localização negada', 'Não foi possível obter a localização sem permissão.');
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
      Alert.alert('Localização', 'Localização capturada com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro na Localização', 'Não foi possível obter a localização: ' + error.message);
      setLocationCoords(null);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileName = `receipts/${user.id}/${Date.now()}_${uri.split('/').pop()}`;
      const img = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, decode(img), {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        throw error;
      }
      const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(data.path);
      return publicUrlData.publicUrl;

    } catch (error: any) {
      Alert.alert('Erro no Upload', 'Não foi possível fazer upload da imagem: ' + error.message);
      return null;
    }
  };

  function decode(input: string): Uint8Array {
    const byteCharacters = atob(input);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Uint8Array(byteNumbers);
  }

  const handleAddExpense = async () => {
    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para adicionar uma transação.');
      return;
    }
    if (!description.trim() || !amount.trim()) {
      Alert.alert('Erro', 'Descrição e Valor são campos obrigatórios.');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Erro', 'O valor deve ser um número positivo.');
      return;
    }

    const finalCategory = category === 'Outra' ? customCategory.trim() : category;
    if (!finalCategory) {
        Alert.alert('Erro', 'A categoria é obrigatória.');
        return;
    }


    setIsAdding(true);
    let imageUrl: string | null = null;

    try {
      if (selectedImage) {
        imageUrl = await uploadImageToSupabase(selectedImage);
        if (!imageUrl) {
          throw new Error('Falha ao fazer upload da imagem.');
        }
      }

      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          description: description.trim(),
          amount: parsedAmount,
          category: finalCategory,
          expense_date: expenseDate.toISOString().split('T')[0],
          type: transactionType,
          location_coords: locationCoords,
          receipt_image_url: imageUrl,
        });

      if (error) {
        throw error;
      }

      Alert.alert('Sucesso', 'Transação adicionado com sucesso!');

      setDescription('');
      setAmount('');
      setCategory(CATEGORIES[0]);
      setCustomCategory('');
      setExpenseDate(new Date());
      setSelectedImage(null);
      setTransactionType('expense');
      setLocationCoords(null);
      router.back();

    } catch (error: any) {
      console.error('Erro ao adicionar a transação:', error.message);
      Alert.alert('Erro', 'Não foi possível adicionar a transação: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  };

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text style={{ color: theme.colors.text, marginTop: theme.spacing.m }}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>Adicionar Transação</Text>
        <TouchableOpacity onPress={toggleTheme}>
          <Ionicons name={theme.dark ? "sunny" : "moon"} size={theme.fontSizes.large} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Detalhes</Text>
            <TextInput
            style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
            onChangeText={setDescription}
            value={description}
            placeholder="Ex: Lanche na escola"
            placeholderTextColor={theme.colors.secondary}
            autoCapitalize="sentences"
            />

            <TextInput
            style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
            onChangeText={setAmount}
            value={amount}
            placeholder="Ex: 25.50"
            placeholderTextColor={theme.colors.secondary}
            keyboardType="numeric"
            />
            
            <View style={[styles.pickerContainer, {borderColor: theme.colors.border, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m}]}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={{ color: theme.colors.text }}
                dropdownIconColor={theme.colors.text}
              >
                {CATEGORIES.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>

            {category === 'Outra' && (
              <TextInput
                style={[styles.input, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, color: theme.colors.text, borderRadius: theme.borderRadius.m }]}
                onChangeText={setCustomCategory}
                value={customCategory}
                placeholder="Qual categoria?"
                placeholderTextColor={theme.colors.secondary}
                autoCapitalize="sentences"
              />
            )}
        </View>

        <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Data e Tipo</Text>
            <TouchableOpacity onPress={showDatepicker} style={[styles.dateInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m }]}>
            <Text style={[styles.dateInputText, { color: theme.colors.text }]}>
                {expenseDate.toLocaleDateString('pt-BR')}
            </Text>
            <Ionicons name="calendar-outline" size={theme.fontSizes.medium} color={theme.colors.secondary} />
            </TouchableOpacity>
            {showDatePicker && (
            <DateTimePicker
                testID="datePicker"
                value={expenseDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
            />
            )}
            <View style={[styles.typeButtonsContainer, {borderColor: theme.colors.primary, borderRadius: theme.borderRadius.m}]}>
            {TRANSACTION_TYPES.map((type) => (
                <TouchableOpacity
                key={type}
                style={[
                    styles.typeButton,
                    {
                    backgroundColor: transactionType === type ? theme.colors.primary : 'transparent',
                    },
                ]}
                onPress={() => setTransactionType(type)}
                >
                <Text style={[styles.typeButtonText, { color: transactionType === type ? '#fff' : theme.colors.text }]}>
                    {type === 'expense' ? 'Despesa' : 'Receita'}
                </Text>
                </TouchableOpacity>
            ))}
            </View>
        </View>

        <View style={styles.section}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Anexos (Opcional)</Text>
            <View style={styles.imagePickerContainer}>
            <TouchableOpacity onPress={pickImage} style={[styles.imagePickerButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m }]}>
                <Ionicons name="image-outline" size={theme.fontSizes.large} color={theme.colors.text} />
                <Text style={[styles.imagePickerButtonText, { color: theme.colors.text }]}>Galeria</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePhoto} style={[styles.imagePickerButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.m, marginLeft: width * 0.02 }]}>
                <Ionicons name="camera-outline" size={theme.fontSizes.large} color={theme.colors.text} />
                <Text style={[styles.imagePickerButtonText, { color: theme.colors.text }]}>Câmera</Text>
            </TouchableOpacity>
            </View>
            {selectedImage && (
            <Image source={{ uri: selectedImage }} style={[styles.receiptImage, {borderColor: theme.colors.border}]} />
            )}
        </View>

        <View style={styles.section}>
            <TouchableOpacity
            onPress={getLocation}
            style={[styles.locationButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderRadius: theme.borderRadius.m }]}
            disabled={isFetchingLocation}
            >
            {isFetchingLocation ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
            ) : (
                <>
                <Ionicons name="locate-outline" size={theme.fontSizes.large} color={theme.colors.text} />
                <Text style={[styles.locationButtonText, { color: theme.colors.text }]}>
                    {locationCoords ? 'Localização Capturada' : 'Capturar Localização'}
                </Text>
                </>
            )}
            </TouchableOpacity>
            {/* MODIFICAÇÃO 6: Exibir o mapa com o marcador quando a localização for capturada */}
            {locationCoords && (
              <View>
                <Text style={[styles.locationText, { color: theme.colors.secondary }]}>
                  {`Lat: ${locationCoords.latitude.toFixed(4)}, Lon: ${locationCoords.longitude.toFixed(4)}`}
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


        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.m }]}
          onPress={handleAddExpense}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Adicionar Transação</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: width * 0.05,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: height * 0.06,
        marginBottom: height * 0.025,
    },
    headerText: {
        fontSize: width * 0.05,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingBottom: height * 0.05,
    },
    section: {
        width: '100%',
        marginBottom: height * 0.03,
    },
    label: {
        fontSize: width * 0.04,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginBottom: height * 0.015,
    },
    input: {
        height: height * 0.065,
        borderWidth: 1.5,
        marginBottom: height * 0.02,
        paddingHorizontal: width * 0.04,
        fontSize: width * 0.04,
        width: '100%',
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: height * 0.065,
        borderWidth: 1.5,
        marginBottom: height * 0.02,
        paddingHorizontal: width * 0.04,
        width: '100%',
    },
    dateInputText: {
        fontSize: width * 0.04,
        flex: 1,
    },
    button: {
        paddingVertical: height * 0.02,
        alignItems: 'center',
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontSize: width * 0.045,
        fontWeight: 'bold',
    },
    typeButtonsContainer: {
        flexDirection: 'row',
        width: '100%',
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    typeButton: {
        flex: 1,
        paddingVertical: height * 0.015,
        alignItems: 'center',
        borderWidth: 0,
    },
    typeButtonText: {
        fontSize: width * 0.038,
        fontWeight: 'bold',
    },
    imagePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: height * 0.02,
    },
    imagePickerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: height * 0.015,
        borderWidth: 1,
    },
    imagePickerButtonText: {
        fontSize: width * 0.038,
        marginLeft: width * 0.02,
    },
    receiptImage: {
        width: '100%',
        height: height * 0.2,
        resizeMode: 'contain',
        marginTop: height * 0.01,
        borderRadius: 8,
        borderWidth: 1,
    },
    locationButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: height * 0.06,
        borderWidth: 1,
        paddingHorizontal: width * 0.04,
        width: '100%',
    },
    locationButtonText: {
        fontSize: width * 0.04,
        marginLeft: width * 0.02,
    },
    locationText: {
        fontSize: width * 0.035,
        alignSelf: 'flex-start',
        marginTop: height * 0.02,
        marginBottom: height * 0.01,
    },
    pickerContainer: {
        width: '100%',
        borderRadius: 10,
        marginBottom: 20,
        justifyContent: 'center',
        borderWidth: 1.5,
      },
    // MODIFICAÇÃO 7: Adicionar estilo para o mapa
    map: {
        width: '100%',
        height: height * 0.25,
        borderRadius: 8,
        marginBottom: height * 0.02,
    },
});