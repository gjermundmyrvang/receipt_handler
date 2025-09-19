export type Receipt = {
  store_name?: string;
  date?: string;
  time?: string;
  total_sum?: string;
  items?: ReceiptItem[];
};

export type ReceiptItem = {
  name?: string;
  quantity?: string;
  unit?: string;
  unit_price?: string;
  total_price?: string;
};
