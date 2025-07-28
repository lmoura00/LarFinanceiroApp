import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/supabaseClient";
import { useTheme } from "@/Hooks/ThemeContext";
import { useAuth } from "@/Hooks/AuthContext";
import { useFocusEffect } from "expo-router";

// --- Interfaces ---
interface Medal {
  id: string;
  child_id: string;
  name: string;
  description: string;
  achieved_at: string;
  prize_amount: number | null;
}

interface Child {
    id: string;
    name: string;
}

interface MedalsByChild {
    childId: string;
    childName: string;
    medals: Medal[];
}

// --- Dimensions ---
const { width, height } = Dimensions.get("window");

export default function AwardsScreen() {
  const [medalsByChild, setMedalsByChild] = useState<MedalsByChild[]>([]);
  const [myMedals, setMyMedals] = useState<Medal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [selectedMedal, setSelectedMedal] = useState<Medal | null>(null);
  const [prizeAmount, setPrizeAmount] = useState("");

  const { theme } = useTheme();
  const { user, profile } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
        if (profile.role === 'admin' || profile.role === 'responsible') {
            const { data: childrenData, error: childrenError } = await supabase
                .from('children')
                .select('id, name')
                .eq('parent_id', user.id);
            if(childrenError) throw childrenError;

            if (!childrenData || childrenData.length === 0) {
                setMedalsByChild([]);
                setLoading(false);
                return;
            }

            const childrenIds = childrenData.map(c => c.id);
            const { data: medalsData, error: medalsError } = await supabase
                .from('medals')
                .select('*')
                .in('child_id', childrenIds)
                .order('achieved_at', { ascending: false });
            
            if (medalsError) throw medalsError;

            const groupedMedals = childrenData.map(child => ({
                childId: child.id,
                childName: child.name,
                medals: medalsData?.filter(medal => medal.child_id === child.id) || []
            }));

            setMedalsByChild(groupedMedals);

        } else {
            const { data, error } = await supabase
                .from('medals')
                .select('*')
                .eq('child_id', user.id)
                .order('achieved_at', { ascending: false });
            if (error) throw error;
            setMyMedals(data || []);
        }
    } catch (error: any) {
        Alert.alert("Erro ao buscar prêmios", error.message);
    } finally {
        setLoading(false);
    }
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await fetchData();
      };

      loadData();
    }, [fetchData])
  );

  const handleGivePrize = async () => {
    if (!selectedMedal || !prizeAmount.trim() || !user) {
        Alert.alert("Erro", "Por favor, insira um valor para o prêmio.");
        return;
    }
    const amount = parseFloat(prizeAmount);
    if (isNaN(amount) || amount <= 0) {
        Alert.alert("Erro", "O valor do prêmio deve ser um número positivo.");
        return;
    }
    
    const { error: expenseError } = await supabase.from('expenses').insert({
        user_id: user.id, 
        description: `Prêmio para meta: ${selectedMedal.name}`,
        amount: amount,
        type: 'expense',
        category: 'Prêmio',
        expense_date: new Date().toISOString(),
    });

    if (expenseError) {
        Alert.alert("Erro", "Não foi possível debitar o valor do seu saldo.");
        return;
    }

    
    const { error: incomeError } = await supabase.from('expenses').insert({
        user_id: selectedMedal.child_id,
        description: `Prêmio pela meta: ${selectedMedal.name}`,
        amount: amount,
        type: 'income',
        category: 'Prêmio',
        expense_date: new Date().toISOString(),
    });

    if (incomeError) {
        Alert.alert("Erro", "Não foi possível registrar o prêmio como uma transação para o dependente.");
        return;
    }

   
    const { error: medalError } = await supabase
        .from('medals')
        .update({ prize_amount: amount })
        .eq('id', selectedMedal.id)
        .select(); 

    if (medalError) {
        Alert.alert("Erro", "Não foi possível atualizar o status do prêmio na medalha.");
    } else {
        Alert.alert("Sucesso!", `Prêmio de ${amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} concedido.`);
        setShowPrizeModal(false);
        setPrizeAmount("");
        setSelectedMedal(null);
        fetchData(); 
    }
  };

  const openPrizeModal = (medal: Medal) => {
    setSelectedMedal(medal);
    setShowPrizeModal(true);
  };

  const isParent = profile?.role === "admin" || profile?.role === "responsible";

  if (loading) {
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: theme.colors.text }]}>
          {isParent ? "Prêmios da Família" : "Meus Prêmios"}
        </Text>
      </View>

      {isParent ? (
        medalsByChild.every((child) => child.medals.length === 0) ? (
          <Text style={[styles.noDataText, { color: theme.colors.secondary }]}>
            Nenhum prêmio ganho ainda.
          </Text>
        ) : (
          medalsByChild.map(
            (childGroup) =>
              childGroup.medals.length > 0 && (
                <View key={childGroup.childId} style={styles.childSection}>
                  <Text
                    style={[styles.childName, { color: theme.colors.text }]}
                  >
                    {childGroup.childName}
                  </Text>
                  {childGroup.medals.map((medal) => (
                    <View
                      key={medal.id}
                      style={[
                        styles.medalCard,
                        { backgroundColor: theme.colors.card },
                      ]}
                    >
                      <Ionicons
                        name="medal"
                        size={40}
                        color="#FFD700"
                        style={styles.medalIcon}
                      />
                      <View style={styles.medalInfo}>
                        <Text
                          style={[
                            styles.medalTitle,
                            { color: theme.colors.text },
                          ]}
                        >
                          {medal.name}
                        </Text>
                        <Text
                          style={[
                            styles.medalDescription,
                            { color: theme.colors.secondary },
                          ]}
                        >
                          {medal.description}
                        </Text>
                        {medal.prize_amount ? (
                          <Text style={styles.prizeGivenText}>
                            Prêmio de{" "}
                            {medal.prize_amount.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}{" "}
                            concedido!
                          </Text>
                        ) : (
                          <TouchableOpacity
                            style={styles.prizeButton}
                            onPress={() => openPrizeModal(medal)}
                          >
                            <Text style={styles.prizeButtonText}>
                              Dar Prêmio
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )
          )
        )
      ) : myMedals.length === 0 ? (
        <Text style={[styles.noDataText, { color: theme.colors.secondary }]}>
          Nenhum prêmio ganho ainda. Continue se esforçando!
        </Text>
      ) : (
        myMedals.map((medal) => (
          <View
            key={medal.id}
            style={[styles.medalCard, { backgroundColor: theme.colors.card }]}
          >
            <Ionicons
              name="medal"
              size={40}
              color="#FFD700"
              style={styles.medalIcon}
            />
            <View style={styles.medalInfo}>
              <Text style={[styles.medalTitle, { color: theme.colors.text }]}>
                {medal.name}
              </Text>
              <Text
                style={[
                  styles.medalDescription,
                  { color: theme.colors.secondary },
                ]}
              >
                {medal.description}
              </Text>
              {medal.prize_amount && (
                <Text style={styles.prizeGivenText}>
                  Você ganhou um prêmio de{" "}
                  {medal.prize_amount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                  !
                </Text>
              )}
              <Text
                style={[styles.medalDate, { color: theme.colors.secondary }]}
              >
                Conquistado em:{" "}
                {new Date(medal.achieved_at).toLocaleDateString("pt-BR")}
              </Text>
            </View>
          </View>
        ))
      )}

      {/* Give Prize Modal */}
      <Modal visible={showPrizeModal} transparent={true} animationType="slide">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Dar Prêmio
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                marginBottom: 15,
                textAlign: "center",
              }}
            >
              Conquista: {selectedMedal?.name}
            </Text>
            <TextInput
              placeholder="Valor do prêmio (ex: 50)"
              value={prizeAmount}
              onChangeText={setPrizeAmount}
              keyboardType="numeric"
              style={[
                styles.input,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
              placeholderTextColor={theme.colors.secondary}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                onPress={() => {
                  setShowPrizeModal(false);
                  setPrizeAmount("");
                }}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.secondary },
                ]}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGivePrize}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text style={styles.modalButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: width * 0.05 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: height * 0.05,
    marginBottom: height * 0.03,
    alignItems: "center",
  },
  headerText: { fontSize: width * 0.08, fontWeight: "bold" },
  childSection: { marginBottom: 20 },
  childName: { fontSize: width * 0.05, fontWeight: "bold", marginBottom: 10 },
  medalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  medalIcon: { marginRight: 15 },
  medalInfo: { flex: 1 },
  medalTitle: { fontSize: width * 0.05, fontWeight: "bold" },
  medalDescription: { fontSize: width * 0.04, marginVertical: 4 },
  medalDate: { fontSize: width * 0.03, fontStyle: "italic", marginTop: 5 },
  noDataText: { textAlign: "center", marginTop: 50, fontSize: width * 0.04 },
  prizeButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  prizeButtonText: { color: "#fff", fontWeight: "bold" },
  prizeGivenText: {
    fontSize: width * 0.035,
    fontWeight: "bold",
    color: "#27ae60",
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { width: "90%", padding: 20, borderRadius: 10 },
  modalTitle: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalButtonText: { color: "#fff", fontWeight: "bold" },
});