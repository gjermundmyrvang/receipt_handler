import React from "react";
import { FAB } from "react-native-paper";

type Props = {
  icon: string;
  displayName?: string;
  onClick: () => void;
};

export default function CustomFAB({ icon, onClick }: Props) {
  return (
    <FAB
      icon={icon}
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        margin: 18,
      }}
      onPress={onClick}
    />
  );
}
