<script setup>
import { ref } from "vue";
import axios from "axios";

definePageMeta({
  layout: "noside",
});

const router = useRouter();
const { getBets } = useBets();
const { loggedIn } = useAuth();
const { getPrintTicket } = useTicket();
const { url } = useUrl();

const bets = ref([]);
const activeTab = ref(4);
const filtered = computed(() => {
  if (bets.value.length === 0) return [];

  if (activeTab.value === 4) return bets.value;

  return bets.value.filter((b) => b.status === activeTab.value);
});
const details = ref({});

setTimeout(() => {
  console.log(filtered.value);
}, 2000);

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
];

function selectTab(index) {
  activeTab.value = index;
}

function formatDate(iso) {
  const d = new Date(iso);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

onMounted(async () => {
  if (!loggedIn.value) return router.push("/prematch");
  // bets.value = await getBets();
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

    <DateSelect
      @change="
        async ({ start, end }) => {
          console.log(start, end);
          bets = await getBets();
        }
      "
    />

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
              <div>{{ b.created_at }}</div>
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
            <div
              class="w-2 h-2 rounded-full"
              :style="{
                backgroundColor:
                  b.status === 'won'
                    ? 'green'
                    : b.status === 'lost' || b.status === 'rewarded'
                      ? 'red'
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
                      t.start_time
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
              <div>{{ formatDate(b.created_at) }}</div>
              <div class="flex items-center gap-2">
                ID: {{ b.id }}
                <UIcon
                  @click="getPrintTicket(b.id)"
                  name="material-symbols:print"
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
                  : b.status === "lost" || b.status === "rewarded"
                    ? "LOST"
                    : "PENDING"
              }}</span>
              <UIcon
                :name="
                  b.status === 'won'
                    ? 'ix:success-filled'
                    : b.status === 'lost' || b.status === 'rewarded'
                      ? 'carbon:close-filled'
                      : 'stash:circle-duotone'
                "
                :style="{
                  backgroundColor:
                    b.status === 'won'
                      ? 'green'
                      : b.status === 'lost' || b.status === 'rewarded'
                        ? 'red'
                        : '#E1E1E1',
                }"
              />
            </div>

            <div>
              {{
                b.status === "won" || b.status === "rewarded"
                  ? Math.min(
                      (
                        Number(b.potential_win) +
                        Number(b.bonus_amount) -
                        Number(b.tax_amount)
                      ).toFixed(2),
                      850000,
                    )
                  : 0.0
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
                <div class="text-[#49215D]">{{ t.start_time }}</div>
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
    </div>
  </div>
</template>
