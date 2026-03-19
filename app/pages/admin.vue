<script setup>
import axios from "axios";
import { ref, onMounted } from "vue";

definePageMeta({
  layout: "noside",
});

const router = useRouter();
const { url } = useUrl();
const { user, checkSession, loggedIn } = useAuth();

const users = ref([]);
const activeTab = ref(1);

// pagination
const page = ref(1);
const limit = 10;
const totalPages = ref(1);

// modals
const depositModal = ref(false);
const withdrawModal = ref(false);
const selectedUser = ref(null);
const createModal = ref(null);

const depositAmount = ref(0);
const withdrawAmount = ref(0);
const depositResponse = ref(null);
const withdrawResponse = ref(null);
const newUser = ref({
  phone: "",
  password: "",
});

const createResponse = ref(null);

const search = ref("");
const results = ref([]);
const loading = ref(false);

let cancelToken;

const tabs = [
  { label: "Summary", value: 1 },
  { label: "Users", value: 0 },
  { label: "Transactions", value: 2 },
];
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
  fetchSummary();
});

function formatToLocalTime(utcString) {
  // 1. SAFEGUARD: Return a placeholder if the string is missing or invalid
  if (!utcString || typeof utcString !== "string") {
    return "---"; // Or "Pending" / "N/A"
  }

  try {
    // 2. Normalize the string for JavaScript's Date engine
    // Result: "2026-03-17T21:00:00Z"
    const isoString = utcString.replace(" ", "T") + "Z";
    const date = new Date(isoString);

    // 3. SAFEGUARD: Check if the resulting date is actually valid (e.g. not "Invalid Date")
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    // 4. Format for Ethiopia (EAT)
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch (error) {
    console.error("Date conversion error:", error);
    return "---";
  }
}

function selectTab(value) {
  activeTab.value = value;
}

async function fetchUsers() {
  const res = await axios.post(
    `${url}/api/get-children`,
    {
      userId: user.value?.id,
      page: page.value,
      limit: 10,
      search: search.value,
    },
    { withCredentials: true },
  );

  users.value = res.data.result.data;
  totalPages.value = res.data.result.pagination.totalPages;

  console.log(users.value, totalPages.value);
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    fetchUsers();
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value--;
    fetchUsers();
  }
}

function openDeposit(u) {
  selectedUser.value = u;
  depositModal.value = true;
}

function openWithdraw(u) {
  selectedUser.value = u;
  withdrawModal.value = true;
}

async function depositAMountToUser(userId, adminId) {
  try {
    const res = await axios.post(
      `${url}/api/payment/transfer`,
      {
        receiverId: userId,
        amount: depositAmount.value,
      },
      { withCredentials: true },
    );

    depositResponse.value = "Deposit successful";
    await fetchUsers();
    checkSession();
  } catch (error) {
    depositResponse.value = error.response?.data?.message;
  }
}

async function withdrawAMountToUser(userId, adminId) {
  try {
    const res = await axios.post(
      `${url}/api/payment/collect`,
      {
        senderId: userId,
        amount: withdrawAmount.value,
      },
      { withCredentials: true },
    );

    withdrawResponse.value = "Withdraw successful";
    await fetchUsers();
    checkSession();
  } catch (error) {
    withdrawResponse.value = error.response?.data?.message;
  }
}

watch(search, async (value) => {
  if (!value || value.length < 1) {
    fetchUsers();
    return;
  }
  fetchUsers();
});

async function createUser() {
  try {
    if (!newUser.value.phone || !newUser.value.password) {
      createResponse.value = "All fields are required";
      return;
    }

    // call backend here
    const res = await axios.post(
      `${url}/api/users/create`,
      {
        username: newUser.value.phone,
        password: newUser.value.password,
        role: "player",
      },
      {
        withCredentials: true,
      },
    );

    createResponse.value = res.data.message;

    fetchUsers();

    // optional reset
    newUser.value.phone = "";
    newUser.value.password = "";
  } catch (error) {
    createResponse.value = error.response?.data?.message;
  }
}

watch(loggedIn, (newVal) => {
  if (!newVal) return router.push("/prematch");
});

const summary = ref(null);
const transaction = ref(null);
const tTotal = ref(null);
const tPage = ref(1);

const fetchSummary = async (range) => {
  const res = await axios.post(
    `${url}/api/financial-report`,
    {
      userId: user.value?.id,
      range: filter.value,
    },
    {
      withCredentials: true,
    },
  );

  if (!res?.data?.error) {
    summary.value = res.data.report.result;
    console.log(summary.value);
  }
};

const fetchTransactions = async () => {
  const res = await axios.get(
    `${url}/api/payment/history?page=${tPage.value}&limit=50`,

    {
      withCredentials: true,
    },
  );
  transaction.value = res.data.transactions.transactions;
  tTotal.value = res.data.transactions.total;
};

watch(tPage, async (newVal) => {
  fetchTransactions();
});

watch(
  () => user.value?.id, // Watch the specific ID instead of just the login status
  async (newId) => {
    if (newId) {
      // Now we ARE sure the user ID is ready
      await Promise.all([
        fetchUsers(),
        fetchSummary("day"),
        fetchTransactions(),
      ]);
    }
  },
  { immediate: true },
);

// onMounted(() => {
//   setTimeout(() => {
//     if (!loggedIn.value) return router.push("/prematch");

//   }, 1500);
// });
</script>

<template>
  <div class="w-full max-w-4xl mx-auto">
    <div
      class="h-8 uppercase bg-[#49215D] text-white flex justify-center items-center"
    >
      admin
    </div>

    <!-- Tabs -->
    <div class="flex border-b text-sm font-semibold">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="selectTab(tab.value)"
        class="flex-1 px-4 py-1 cursor-pointer"
        :class="activeTab === tab.value ? 'border-b-2 border-[#49215D]' : ''"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab == 0">
      <div class="flex justify-center px-2 my-3 items-center cursor-pointer">
        <div
          @click="createModal = true"
          class="p-2 bg-[#49215D] text-white w-full flex justify-center cursor-pointer"
        >
          Create new user
        </div>
      </div>

      <div class="my-3 flex gap-1 px-2">
        <input
          v-model="search"
          type="text"
          class="h-10 px-2 bg-white border outline-0 flex-1"
          placeholder="Search user by phone"
        />
      </div>

      <div class="text-sm my-2 flex justify-around items-center">
        <button
          @click="prevPage"
          :disabled="page === 1"
          class="disabled:opacity-30"
        >
          ◀
        </button>

        <div>Page {{ page }} / {{ totalPages }}</div>

        <button
          @click="nextPage"
          :disabled="page === totalPages"
          class="disabled:opacity-30"
        >
          ▶
        </button>
      </div>

      <div v-if="users.length === 0">
        <div class="text-sm text-center my-1 text-red-900 flex justify-around">
          No user
        </div>
      </div>

      <div v-else-if="loading">Searching...</div>

      <div v-else>
        <div
          v-for="u in users"
          :key="u.user_id"
          class="h-10 bg-white my-0.5 flex justify-between items-center text-xs px-2"
        >
          <div>
            <div>{{ u.username }}</div>
            <div class="opacity-50">{{ u.role }}</div>
          </div>

          <div>
            <div>Withdrawable: {{ u.real_balance }} ETB</div>
            <div class="opacity-50">Bonus: {{ u.bonus_balance }} ETB</div>
          </div>

          <div class="flex gap-2">
            <button
              @click="openDeposit(u)"
              class="px-2 py-1 bg-[#FBCC01] rounded"
            >
              Deposit
            </button>

            <button
              @click="openWithdraw(u)"
              class="px-2 py-1 bg-red-500 text-white rounded"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 1" class="py-4">
      <!-- <DateSelect
        @change="
          async ({ start, end }) => {
            await fetchSummary(start, end);
          }
        "
      /> -->
      <div
        class="w-full flex flex-col md:flex-row gap-3 justify-center items-center"
      >
        <select
          v-model="filter"
          class="text-sm w-full md:w-[200px] uppercase font-bold border-2 bg-gray-100 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
        >
          <option v-for="o in options" :key="o" :value="o">{{ o }}</option>
        </select>
      </div>
      <div
        class="w-full max-w-2xl my-3 mx-auto bg-slate-300 text-slate-900 rounded-xl p-4 shadow-lg"
      >
        <!-- Header -->
        <div class="text-sm text-slate-700 mb-1">{{}}</div>

        <div class="text-xs text-slate-800 mb-4">
          {{ formatToLocalTime(summary?.startTime) }}
          →
          {{ formatToLocalTime(summary?.endTime) }}
        </div>

        <!-- Stats -->
        <div class="space-y-2 text-sm">
          <div v-for="s in summary?.statistics" class="flex justify-between">
            <span class="uppercase">{{ s.type }}</span>
            <span class="font-semibold">ETB {{ s.total_amount }}</span>
          </div>
        </div>

        <!-- Divider -->
        <div class="my-3 border-t border-slate-700"></div>
      </div>
    </div>

    <div v-if="activeTab === 2" class="py-4">
      <table class="w-full border text-sm">
        <thead>
          <tr class="border-b">
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance</th>
            <th>From</th>
            <th>To</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="t in transaction" :key="t.transaction_id" class="border-b">
            <td class="text-center">{{ t.created_at }}</td>
            <td class="text-center">{{ t.type }}</td>
            <td class="text-center">{{ t.amount }}</td>
            <td class="text-center">{{ t.balance_after }}</td>
            <td class="text-center">{{ t.initiator }}</td>
            <td class="text-center">{{ t.target || "-" }}</td>
          </tr>
        </tbody>
      </table>

      <div
        class="flex items-center justify-center gap-1 mt-6 text-sm select-none"
      >
        <!-- Prev -->
        <button
          :disabled="tPage === 1"
          @click="tPage--"
          class="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>

        <span>{{ tPage }}</span>
        <!-- Next -->
        <button
          :disabled="tPage === tTotal"
          @click="tPage++"
          class="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>

    <div
      v-if="depositModal || withdrawModal"
      class="fixed inset top-0 left-0 right-0 bottom-0 bg-black/50"
    ></div>

    <div v-if="depositModal" class="fixed inset-0 bg-black/50 z-50">
      <div
        class="w-[90%] max-w-80 mx-auto bg-[#e6e6e6] p-2 mt-20 md:mt-30 rounded"
      >
        <div class="flex justify-between border-b">
          <span>Deposit</span>
          <button
            @click="
              depositModal = false;
              depositResponse = null;
            "
          >
            ✕
          </button>
        </div>

        <div class="mt-3 text-center">
          <div>Phone: {{ selectedUser.phone }}</div>
          <div>ID: {{ selectedUser.id }}</div>
          <input
            v-model="depositAmount"
            type="number"
            class="border h-10 w-full my-2 px-2"
          />
          <button
            @click="depositAMountToUser(selectedUser.user_id, user.id)"
            class="bg-[#FBCC01] px-4 py-2 rounded"
          >
            Deposit
          </button>
          <div>{{ depositResponse }}</div>
        </div>
      </div>
    </div>

    <div v-if="withdrawModal" class="fixed inset-0 bg-black/50 z-50">
      <div
        class="w-[90%] max-w-80 mx-auto bg-[#e6e6e6] p-2 mt-20 md:mt-30 rounded"
      >
        <div class="flex justify-between border-b">
          <span>Withdraw</span>
          <button
            @click="
              withdrawModal = false;
              withdrawResponse = null;
            "
          >
            ✕
          </button>
        </div>

        <div class="mt-3 text-center">
          <div>Phone: {{ selectedUser.phone }}</div>
          <div>ID: {{ selectedUser.id }}</div>
          <input
            v-model="withdrawAmount"
            type="number"
            class="border h-10 w-full my-2 px-2"
          />
          <button
            @click="withdrawAMountToUser(selectedUser.user_id, user.id)"
            class="bg-[#FBCC01] px-4 py-2 rounded"
          >
            Withdraw
          </button>
          <div>{{ withdrawResponse }}</div>
        </div>
      </div>
    </div>

    <div v-if="createModal" class="fixed inset-0 bg-black/50 z-50">
      <div
        class="w-[90%] max-w-80 mx-auto bg-[#e6e6e6] p-2 mt-20 md:mt-30 rounded"
      >
        <!-- Header -->
        <div class="flex justify-between border-b">
          <span>Create User</span>
          <button
            @click="
              createModal = false;
              createResponse = null;
              newUser.value.phone = '';
              newUser.value.password = '';
            "
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="mt-3 text-center">
          <input
            v-model="newUser.phone"
            type="text"
            placeholder="Username"
            class="border h-10 w-full my-2 px-2"
          />

          <input
            v-model="newUser.password"
            type="password"
            placeholder="Password"
            class="border h-10 w-full my-2 px-2"
          />

          <button
            @click="createUser"
            class="bg-[#FBCC01] px-4 py-2 rounded w-full"
          >
            Create
          </button>

          <div class="mt-2 text-sm">{{ createResponse }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
