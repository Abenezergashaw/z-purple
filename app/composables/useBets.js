import axios from "axios";
import { ref } from "vue";

export function useBets() {
  const bets = ref([]);

  const getBets = async (start, end) => {
    const { url } = useUrl();

    const response = await axios.get(`${url}/api/bet-history?userId=12`, {
      withCredentials: true,
    });

    return response.data.result.tickets;
  };

  return { bets, getBets };
}
