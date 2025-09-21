import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Image, ScrollView, View } from "react-native";
import {
  Button,
  Card,
  DataTable,
  Icon,
  IconButton,
  List,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import CustomFAB from "../components/CustomFAB";
import { Receipt, ReceiptItem } from "../types";

const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

export default function Homescreen() {
  const { colors } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [expenses, setExpenses] = useState<string[]>([]);

  const totalSum = (receipt?.items ?? []).reduce((acc, item) => {
    const price = parseFloat(item.total_price || "0");
    return acc + (isNaN(price) ? 0 : price);
  }, 0);

  const startEdit = (index: number) => {
    const item = receipt?.items?.[index];
    if (!item) return;
    setEditingIndex(index);
    setEditName(item.name || "");
    setEditPrice(item.total_price || "");
  };

  const saveEdit = () => {
    if (editingIndex === null || !receipt?.items) return;
    const updatedItems: ReceiptItem[] = [...receipt.items];
    updatedItems[editingIndex] = {
      ...updatedItems[editingIndex],
      name: editName,
      total_price: editPrice,
    };
    setReceipt({ ...receipt, items: updatedItems });
    setEditingIndex(null);
    setEditName("");
    setEditPrice("");
  };

  const removeItem = (index: number) => {
    if (!receipt?.items) return;
    const updatedItems = receipt.items.filter((_, i) => i !== index);
    setReceipt({ ...receipt, items: updatedItems });
  };

  // Picking image from gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      performOCR(result.assets[0]);
      hideModal();
    }
  };

  // Take photo with camera
  const takeImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera permission is required!");
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      performOCR(result.assets[0]);
      hideModal();
    }
  };

  const performOCR = (file: any) => {
    setLoadingText("Reading receipt...");
    let myHeaders = new Headers();
    myHeaders.append("apikey", API_KEY);
    myHeaders.append("Content-Type", "multipart/form-data");

    let raw = file;
    let requestOptions = {
      method: "POST",
      redirect: "follow" as RequestRedirect,
      headers: myHeaders,
      body: raw,
    };

    // POST request to the OCR API
    fetch("https://api.apilayer.com/image_to_text/upload", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        console.log("RESULT", result["all_text"]);
        const ocrText = result["all_text"];
        parseReceipt(ocrText);
      })
      .catch((error) => console.log("error", error));
  };

  const parseReceipt = async (text: string) => {
    setLoadingText("Generating receipt ...");
    const prompt = `
        You are an assistant that parses OCR text from receipts. 
        Given the following text from a Norwegian food receipt, Extract the store name, date, time, and total sum. 
        Then extract all purchased items into a structured JSON array. 
        Each item should include name, quantity, unit, unit price if available, and total price if available. 
        RECEIPT TEXT: ${text}
        Return ONLY JSON.
        `;
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen3-Next-80B-A3B-Instruct:novita",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    // Parse response as JSON
    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";
    setLoadingText("");
    const receipt: Receipt = parseReceiptResponse(JSON.parse(result));
    console.log("Receipt:", receipt);
    setReceipt(receipt);
  };

  const parseReceiptResponse = (data: any): Receipt => {
    return {
      store_name: data.store_name,
      date: data.date,
      time: data.time,
      total_sum: data.total_sum,
      items: data.items.map(
        (item: any): ReceiptItem => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })
      ),
    };
  };
  const handleAddExpense = (expense: string) => {
    setLoadingText("");
    setReceipt(null);
    setImage(null);
    setExpenses([...expenses, expense]);
  };

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  return (
    <View
      style={{ backgroundColor: colors.background, flex: 1, paddingTop: 50 }}
    >
      <ScrollView>
        <Text
          variant="titleLarge"
          style={{ marginLeft: 20, fontWeight: "800" }}
        >
          GROUP NAME
        </Text>

        {image && (
          <View
            style={{
              gap: 10,
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={{ uri: image }}
              style={{ width: 200, height: 200, marginVertical: 20 }}
            />
            <Text variant="titleLarge">{loadingText}</Text>
          </View>
        )}
        <View
          style={{
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <List.Item
            title="389 kr"
            description="Your share: 194.50 kr"
            descriptionStyle={{ color: colors.primary }}
            style={{ maxWidth: "75%", alignSelf: "flex-start", marginLeft: 20 }}
            containerStyle={{
              backgroundColor: colors.secondary,
              padding: 10,
              borderRadius: 16,
            }}
            left={() => (
              <Icon
                source={"face-man-profile"}
                color={colors.primary}
                size={40}
              />
            )}
          />
          {expenses.length > 0 && (
            <View>
              {expenses.map((d, i) => (
                <List.Item
                  key={i}
                  title={`${d} kr`}
                  description={`Your share: ${Number(d) / 2} kr`}
                  descriptionStyle={{ color: colors.primary }}
                  style={{
                    maxWidth: "75%",
                    alignSelf: "flex-end",
                  }}
                  containerStyle={{
                    backgroundColor: colors.secondary,
                    padding: 10,
                    borderRadius: 16,
                  }}
                  right={() => (
                    <Icon
                      source={"face-man"}
                      color={colors.primary}
                      size={40}
                    />
                  )}
                />
              ))}
            </View>
          )}
        </View>

        {receipt && (
          <Card
            style={{ margin: 8, padding: 16, marginBottom: 100 }}
            mode="contained"
          >
            <Text variant="headlineMedium">
              {receipt.store_name || "Unknown Store"}
            </Text>
            <Text variant="bodyMedium">
              {receipt.date || "Unknown Date"} – {receipt.time || ""}
            </Text>

            {editingIndex !== null && (
              <Card
                mode="contained"
                style={{ marginVertical: 10 }}
                contentStyle={{ padding: 8 }}
                theme={{ colors: { surfaceVariant: "#000000ff" } }}
              >
                <TextInput
                  label="Name"
                  value={editName}
                  onChangeText={setEditName}
                  style={{ marginTop: 4 }}
                  mode="outlined"
                />
                <TextInput
                  label="Total Price"
                  value={editPrice}
                  keyboardType="numeric"
                  onChangeText={setEditPrice}
                  style={{ marginTop: 4 }}
                  mode="outlined"
                />
                <Button
                  mode="outlined"
                  onPress={saveEdit}
                  style={{ marginTop: 8 }}
                >
                  Save
                </Button>
              </Card>
            )}

            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Item</DataTable.Title>
                <DataTable.Title numeric>Price</DataTable.Title>
                <DataTable.Title numeric>Actions</DataTable.Title>
              </DataTable.Header>

              {(receipt.items ?? []).map((item, index) => (
                <DataTable.Row
                  key={index}
                  style={{
                    borderBottomWidth: 2,
                    borderColor: "#fff",
                  }}
                >
                  <DataTable.Cell>{item.name || "Unknown"}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    {parseFloat(item.total_price || "0").toFixed(2)} kr
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => startEdit(index)}
                      iconColor={colors.primary}
                    />
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      onPress={() => removeItem(index)}
                      iconColor={colors.primary}
                    />
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>

            <View style={{ marginTop: 16 }}>
              <Text variant="titleLarge">Total: {totalSum.toFixed(2)} kr</Text>
            </View>
            <View style={{ marginTop: 16 }}>
              <Button
                mode="contained"
                onPress={() => handleAddExpense(totalSum.toFixed(2))}
              >
                Add expense
              </Button>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Modal for selecting from gallery or taking picture */}
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
          contentContainerStyle={{
            padding: 20,
            gap: 10,
            backgroundColor: colors.primaryContainer,
            marginHorizontal: 10,
            borderRadius: 18,
          }}
        >
          <Text variant="titleLarge">Select camera option:</Text>
          <Button icon="camera" mode="contained" onPress={takeImage}>
            Take picture
          </Button>
          <Button icon="camera-image" mode="outlined" onPress={pickImage}>
            Select from gallery
          </Button>
        </Modal>
      </Portal>

      <CustomFAB icon="plus" onClick={showModal} />
      <StatusBar style="auto" />
    </View>
  );
}
