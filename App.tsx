import { PaperProvider } from "react-native-paper";
import Homescreen from "./screens/Homescreen";

export default function App() {
  return (
    <PaperProvider>
      <Homescreen />
    </PaperProvider>
  );
}
