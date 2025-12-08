import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ConfigDocument = {
  rangeStart?: string;
  rangeEnd?: string;
  percentage?: string;
  [key: string]: unknown;
};

export type ConfigsMap = Record<string, ConfigDocument>;

export function useConfigs() {
  const query = useQuery<ConfigsMap>({
    queryKey: ["configs"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "configs"));
      const result: ConfigsMap = {};
      snapshot.forEach((docSnap) => {
        result[docSnap.id] = docSnap.data() as ConfigDocument;
      });
      return result;
    },
  });

  return {
    ...query,
    data: (query.data ?? {}) as ConfigsMap,
  };
}

