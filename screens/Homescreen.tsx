import { StatusBar } from "expo-status-bar";
import { Alert, Image, View } from "react-native";
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
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

export default function Homescreen() {
  const { colors } = useTheme();
  const [image, setImage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Picking image from gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
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
    }
  };

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      {/* Basic header */}
      <Appbar.Header>
        <Appbar.Content title="Receipts" />
      </Appbar.Header>

      {/* TODO: Render saved receiptes in a scrollview or something */}
      <List.Item
        title="First Item"
        description="Item description"
        left={(props) => (
          <List.Icon {...props} icon="folder" color={colors.primary} />
        )}
      />

      {/* Modal for selecting from gallery or taking picture */}
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
          contentContainerStyle={{ padding: 20, gap: 8 }}
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
