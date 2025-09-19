import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Image, ScrollView, View } from "react-native";
import {
  Appbar,
  Button,
  List,
  Modal,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import CustomFAB from "../components/CustomFAB";
import { OpenAI } from "openai";
import { Receipt, ReceiptItem } from "../types";

const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: HF_TOKEN,
});

export default function Homescreen() {
  const { colors } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

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
    setExtractedText("... loading");
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
    const prompt = `
        You are an assistant that parses OCR text from receipts. 
        Given the following text from a Norwegian food receipt, Extract the store name, date, time, and total sum. 
        Then extract all purchased items into a structured JSON array. 
        Each item should include name, quantity, unit, unit price if available, and total price if available. 
        RECEIPT TEXT: ${text}
        Return ONLY JSON.
        `;
    const chatCompletion = await client.chat.completions.create({
      model: "Qwen/Qwen3-Next-80B-A3B-Instruct:novita",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    const result = chatCompletion.choices[0].message.content;
    if (!result) return;
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

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView>
        {/* Basic header */}
        <Appbar.Header mode="large">
          <Appbar.Content title="Receipts" titleStyle={{ fontWeight: "700" }} />
        </Appbar.Header>
        {/* TODO: Render saved receiptes in a scrollview or something */}
        <List.Item
          title="Kiwi Storo"
          description="27.08.2025"
          left={(props) => (
            <List.Icon {...props} icon="text-long" color={colors.primary} />
          )}
        />

        {image && (
          <Image
            source={{ uri: image }}
            style={{ width: 200, height: 200, marginVertical: 20 }}
          />
        )}

        {receipt && (
          <View style={{ gap: 8, paddingBottom: 90 }}>
            <Text variant="titleLarge">{receipt.store_name}</Text>
            <Text variant="titleSmall">{receipt.date}</Text>
            <Text variant="titleMedium">Items:</Text>
            {receipt.items?.map((d) => (
              <View
                key={d.name}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderBottomWidth: 1,
                  borderColor: colors.primary,
                  paddingVertical: 4,
                }}
              >
                <Text variant="titleSmall">{d.name}</Text>
                <Text variant="titleSmall">{d.total_price} kr</Text>
              </View>
            ))}
            <Text variant="titleMedium">Total: {receipt.total_sum} kr</Text>
          </View>
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
