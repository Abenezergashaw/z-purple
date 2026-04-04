<script setup>
import { ref } from "vue";
import axios from "axios";

definePageMeta({
  layout: "noside",
});

const router = useRouter();
const { bets, pagination, getBets, loading } = useBets();
const { loggedIn, user } = useAuth();
const { getPrintTicket } = useTicket();
const { url } = useUrl();

const search = ref("");
const activeTab = ref(4);
const filtered = computed(() => {
  if (bets.value.length === 0) return [];

  if (activeTab.value === 4) return bets.value;

  return bets.value.filter((b) => b.status === activeTab.value);
});
const details = ref({});

const filter = ref("day");
const options = [
  "day",
  "2day",
  "week",
  "2week",
  "month",
  "this_week",
  "this_month",
];

watch(filter, async (v) => {
  search.value = "";
  await getBets({
    userId: 16,
    page: 1,
    limit: 50,
    period: v,
  });
});

watch(search, async (v) => {
  await getBets({
    page: 1,
    limit: 50,
    period: filter.value,
    search: v,
  });
});

const fetchBets = async (page = 1) => {
  await getBets({
    page,
    limit: 50,
    period: filter.value,
  });
};

const showBet = ref([]);
const loadingIds = ref(new Set());

const toggleBet = async (id) => {
  // 1. Check if we already have the data
  const hasData = details.value.hasOwnProperty(id);

  // 2. If no data and not already loading, fetch it
  if (!hasData && !loadingIds.value.has(id)) {
    try {
      loadingIds.value.add(id); // Mark as loading

      const { data } = await axios.get(`${url}/api/bet-selections`, {
        params: { ticketId: id }, // Backend should get userId from session!
      });

      // Use a spread or direct assignment for reactivity
      details.value = { ...details.value, [id]: data.result };
    } catch (err) {
      console.error("Failed to fetch selections:", err);
      return; // Don't toggle if the fetch fails
    } finally {
      loadingIds.value.delete(id); // Done loading
    }
  }

  // 3. Toggle the visibility
  const index = showBet.value.indexOf(id);
  if (index !== -1) {
    showBet.value.splice(index, 1);
  } else {
    showBet.value.push(id);
  }
  console.log(showBet.value);
};

const tabs = [
  { label: "All Bets", key: "one", value: 4 },
  { label: "Open", key: "two", value: "pending" },
  { label: "Lost", key: "three", value: "lost" },
  { label: "Won", key: "four", value: "won" },
  { label: "Bonus", key: "five", value: "rewarded" },
];

function selectTab(index) {
  activeTab.value = index;
}

// function convertToEthiopianTime(utcString) {
//   // 1. Create a Date object (append 'Z' to ensure it's treated as UTC)
//   const date = new Date(utcString.replace(" ", "T") + "Z");

//   // 2. Add 3 hours (3 * 60 * 60 * 1000 milliseconds)
//   const EAT_OFFSET = 3 * 60 * 60 * 1000;
//   const ethiopianDate = new Date(date.getTime() + EAT_OFFSET);

//   // 3. Format back to string
//   const year = ethiopianDate.getUTCFullYear();
//   const month = String(ethiopianDate.getUTCMonth() + 1).padStart(2, "0");
//   const day = String(ethiopianDate.getUTCDate()).padStart(2, "0");
//   const hours = String(ethiopianDate.getUTCHours()).padStart(2, "0");
//   const minutes = String(ethiopianDate.getUTCMinutes()).padStart(2, "0");
//   const seconds = String(ethiopianDate.getUTCSeconds()).padStart(2, "0");

//   return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
// }

function convertToEthiopianTime(utcString) {
  const date = new Date(utcString);

  // Use 'sv-SE' (Sweden) locale because it naturally uses YYYY-MM-DD
  return date.toLocaleString("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const nextPage = () => {
  if (pagination.value && pagination.value.page < pagination.value.totalPages) {
    fetchBets(pagination.value.page + 1);
  }
};

const prevPage = () => {
  if (pagination.value && pagination.value.page > 1) {
    fetchBets(pagination.value.page - 1);
  }
};

onMounted(async () => {
  if (!loggedIn.value) return router.push("/prematch");
  fetchBets();
});
</script>

<template>
  <div class="w-full">
    <div
      class="h-8 uppercase bg-[#49215D] text-white flex justify-center items-center"
    >
      bet list
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-gray-100 text-sm font-semibold px-6">
      <button
        v-for="(tab, index) in tabs"
        :key="tab.key"
        @click="selectTab(tab.value)"
        class="flex-1 md:flex-none md:w-30 px-6 py-1 text-center transition-colors"
        :class="
          activeTab === tab.value
            ? 'border-b-2 border-[#FBCC01] text-black'
            : 'text-gray-500 hover:text-black'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      class="w-full flex flex-col md:flex-row gap-3 justify-center items-center"
    >
      <div class="w-full md:w-auto flex-grow max-w-md">
        <SearchInput v-model:search="search" />
      </div>

      <select
        v-model="filter"
        class="text-sm w-full md:w-[200px] uppercase font-bold border-2 bg-gray-100 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
      >
        <option v-for="o in options" :key="o" :value="o">{{ o }}</option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-6">
      <div
        class="w-6 h-6 border-4 border-gray-300 border-t-black rounded-full animate-spin"
      ></div>
    </div>

    <!-- Panels -->
    <div class="py-2 text-xs space-y-1 md:px-6 md:w-full md:mx-auto">
      <div class="md:hidden">
        <div v-for="b in filtered">
          <div
            @click="toggleBet(b.id)"
            class="bg-[#E1E1E1] flex py-3 items-center mb-0.5"
            style="background-color: #e1e1e1 !important"
          >
            <div
              class="flex flex-col justify-start border-black w-[46%] px-1"
              style="width: 46% !important"
            >
              <div>{{ convertToEthiopianTime(b.created_at) }}</div>
              <div>
                ID: <span class="text-[10px] opacity-75">{{ b.id }}</span>
              </div>
              <div>{{ b.username }}</div>
            </div>
            <div
              class="flex flex-col justify-start border-black w-[46%] px-1"
              style="width: 46% !important"
            >
              <div>Stake: {{ Number(b.stake).toFixed(2) }} ETB</div>
              <div>
                Odds:
                <span class="text-red-500">{{
                  Number(b.final_odds).toFixed(2)
                }}</span>
              </div>
              <div>
                Possible Win:
                {{
                  b.status === "pending"
                    ? Math.min(
                        (
                          Number(b.potential_win) +
                          Number(b.bonus_amount) -
                          Number(b.tax_amount)
                        ).toFixed(2),
                        850000,
                      )
                    : b.status === "lost"
                      ? 0.0
                      : b.status === "won" || b.status === "rewarded"
                        ? Number(b.paid_amount).toFixed(2)
                        : 0.0
                }}
                ETB
              </div>
            </div>
            <div
              class="w-2 h-2 rounded-full"
              :style="{
                backgroundColor:
                  b.status === 'won'
                    ? 'green'
                    : b.status === 'lost'
                      ? 'red'
                      : b.status === 'rewarded'
                        ? '#FFCC32'
                        : '#E1E1E1',
              }"
            ></div>
          </div>

          <div v-if="showBet.includes(b.id)">
            <div v-for="t in details[b.id]">
              <div
                class="bg-[#E1E1E1] flex justify-center py-1 items-center mb-0.5"
                style="background-color: #fff !important"
              >
                <div
                  class="flex flex-col justify-center items-center border-black w-[46%] px-1 font-semibold"
                  style="width: 46% !important"
                >
                  <div>{{ t.event_name }}</div>
                  <div>
                    <span class="text-[10px] opacity-75">{{
                      convertToEthiopianTime(t.start_time)
                    }}</span>
                  </div>
                </div>
                <div
                  class="flex flex-col justify-center items-center border-black w-[46%] px-1 font-semibold"
                  style="width: 46% !important"
                >
                  <div>
                    {{ t.market_name }} - {{ t.price_name }} /
                    {{ t.price_rate }}
                  </div>
                </div>
                <div
                  class="w-2 h-2 rounded-full"
                  :style="{
                    backgroundColor:
                      t.status === 'won'
                        ? 'green'
                        : t.status === 'lost'
                          ? 'red'
                          : '#E1E1E1',
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="hidden md:block">
        <div
          class="grid bg-[#49215D] text-white items-center w-full p-2 font-semibold"
          style="grid-template-columns: 24% 10% 8% 8% 6% 6% 8% 10% 10% 10%"
        >
          <div>Date and ID</div>
          <div>Username</div>
          <div>Bet Type</div>
          <div>Stake</div>
          <div>No events</div>
          <div>Odds</div>
          <div></div>
          <div>Status</div>
          <div>Winning</div>
          <div></div>
        </div>
        <div v-for="b in filtered" :key="b.id" class="mb-1">
          <div
            @click="toggleBet(b.id)"
            class="grid items-center w-full p-2 bg-white cursor-pointer"
            style="grid-template-columns: 24% 10% 8% 8% 6% 6% 8% 10% 10% 10%"
          >
            <!-- Date & ID -->
            <div class="flex flex-col">
              <div>{{ convertToEthiopianTime(b.created_at) }}</div>
              <div class="flex items-center gap-2">
                ID: {{ b.id }}
                <UIcon
                  @click="getPrintTicket(b.id)"
                  name="material-symbols-light:print-rounded"
                  class="text-black"
                />
              </div>
            </div>

            <div>{{ b.username }}</div>
            <div>Prematch</div>
            <div>{{ Number(b.stake).toFixed(2) }} ETB</div>
            <div>{{ b.total_selections }}</div>
            <div>{{ Number(b.final_odds).toFixed(2) }}</div>

            <div class="flex flex-col">
              <div>Possible win:</div>
              <div>
                {{
                  Math.min(
                    (
                      Number(b.potential_win) +
                      Number(b.bonus_amount) -
                      Number(b.tax_amount)
                    ).toFixed(2),
                    850000,
                  )
                }}
                ETB
              </div>
            </div>

            <div class="flex items-center justify-between gap-2 px-2">
              <span>{{
                b.status === "won"
                  ? "WON"
                  : b.status === "lost"
                    ? "LOST"
                    : b.status === "rewarded"
                      ? "BONUS"
                      : "PENDING"
              }}</span>
              <UIcon
                :name="
                  b.status === 'won'
                    ? 'ix:success-filled'
                    : b.status === 'lost'
                      ? 'carbon:close-filled'
                      : b.status === 'rewarded'
                        ? 'noto:yellow-circle'
                        : 'stash:circle-duotone'
                "
                :style="{
                  backgroundColor:
                    b.status === 'won'
                      ? 'green'
                      : b.status === 'lost'
                        ? 'red'
                        : b.status === 'rewarded'
                          ? '#fff'
                          : '#E1E1E1',
                }"
              />
            </div>

            <div>
              {{
                b.status === "won" || b.status === "rewarded"
                  ? Number(b.paid_amount).toFixed(2)
                  : 0
              }}
              ETB
            </div>
            <div></div>
          </div>
          <div>
            <div
              v-for="t in details[b.id]"
              v-if="showBet.includes(b.id)"
              class="grid items-center gap-x-1 w-full px-2 py-1 border-b border-gray-300"
              style="grid-template-columns: 20% 25% 10% 35% 5% 5%"
            >
              <div>
                <div class="text-[#49215D]">
                  {{ convertToEthiopianTime(t.start_time) }}
                </div>
                <div class="text-[#2b2b2b] opacity-75">
                  Football - {{ t.country }} - {{ t.competition }}
                </div>
              </div>

              <div>
                <div class="font-semibold">{{ t.event_name }}</div>
              </div>

              <div></div>

              <div>
                <div>{{ t.market_name }} - {{ t.price_name }}</div>
              </div>

              <div>{{ Number(t.price_rate).toFixed(2) }}</div>

              <div>
                <UIcon
                  :name="
                    t.status === 'won'
                      ? 'ix:success-filled'
                      : t.status === 'lost'
                        ? 'carbon:close-filled'
                        : 'stash:circle-duotone'
                  "
                  :style="{
                    backgroundColor:
                      t.status === 'won'
                        ? 'green'
                        : t.status === 'lost'
                          ? 'red'
                          : '#E1E1E1',
                  }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="pagination"
        class="flex items-center justify-center gap-6 mt-6 border-t pt-4"
      >
        <!-- Prev -->
        <button
          @click="prevPage"
          :disabled="pagination.page === 1"
          class="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
        >
          Prev
        </button>

        <!-- Page Info -->
        <div class="text-xs md:text-sm font-medium">
          Page
          <span class="mx-1 px-2 py-1 bg-gray-100 rounded">
            {{ pagination.page }}
          </span>
          of
          <span class="mx-1 px-2 py-1 bg-gray-100 rounded">
            {{ pagination.totalPages }}
          </span>
        </div>

        <!-- Next -->
        <button
          @click="nextPage"
          :disabled="pagination.page === pagination.totalPages"
          class="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
