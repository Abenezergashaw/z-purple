import axios from "axios";
import { ref } from "vue";

export function useBets() {
  const bets = ref([]);
  const pagination = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const getBets = async ({
    page = 1,
    limit = 20,
    period = "day",
    search = "",
  } = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const { url } = useUrl();

      const res = await axios.get(`${url}/api/bet-history`, {
        params: {
          page,
          limit,
          period,
          search,
        },
        withCredentials: true,
      });

      bets.value = res.data.result.tickets;
      pagination.value = res.data.result.pagination;

      return res.data.result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    bets,
    pagination,
    loading,
    error,
    getBets,
  };
}
