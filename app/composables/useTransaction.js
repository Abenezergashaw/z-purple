import { ref } from "vue";
import axios from "axios";

export function useTransaction() {
  const onDeposit = ref(false);
  const onWithdraw = ref(false);
  const depositError = ref(null);
  const depositSuccess = ref(null);
  const withdrawError = ref(null);
  const withdrawSuccess = ref(null);
  const withdraws = ref(null);
  const account = ref(null);

  const proceedToDepositView = () => {
    onDeposit.value = !onDeposit.value;
  };

  const getAccount = async () => {
    const { url } = useUrl();
    try {
      const res = await axios.get(`${url}/api/get-account`);
      account.value = res.data?.result?.phone || "NA";
    } catch (error) {}
  };

  const proceedToWithdrawView = () => {
    onWithdraw.value = !onWithdraw.value;
  };

  const deposit = async (id) => {
    const { url } = useUrl();
    const { user, checkSession } = useAuth();

    depositError.value = null;
    depositSuccess.value = null;

    if (id === null)
      return (depositError.value = "Invalid Transaction Number.");

    if (user.value === null)
      return (depositError.value = "Please login to deposit.");

    try {
      const response = await axios.post(
        `${url}/payment/deposit`,
        {
          id: 1,
          ref: id,
        },
        { withCredentials: true },
      );

      console.log(response.data);

      depositSuccess.value = "Amount successfully deposited";

      setTimeout(() => {
        checkSession();
        depositSuccess.value = null;
      }, 2000);
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || "Something went wrong";
      console.log(serverMessage);
      depositError.value = err.response?.data?.message;

      setTimeout(() => {
        depositError.value = null;
      }, 5000);
    }
  };

  const withdraw = async (amount) => {
    const { url } = useUrl();
    const { user, checkSession } = useAuth();

    withdrawError.value = null;
    withdrawSuccess.value = null;

    if (amount === null)
      return (withdrawError.value = "Invalid Transaction Number.");

    if (user.value === null)
      return (withdrawError.value = "Please login to withdraw.");
    try {
      const response = await axios.post(
        `${url}/payment/withdraw`,
        {
          amount,
        },
        { withCredentials: true },
      );

      withdrawSuccess.value =
        "Withdraw transaction created. Wait for approval.";

      checkSession();
      setTimeout(() => {
        withdrawSuccess.value = null;
      }, 5000);
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || "Something went wrong";
      console.log(serverMessage);
      withdrawError.value = err.response?.data?.message;

      setTimeout(() => {
        withdrawError.value = null;
      }, 5000);
    }
  };

  const getWithdrawRequests = async () => {
    const { url } = useUrl();

    const response = await axios.get(`${url}/payment/get-withdraws`, {
      withCredentials: true,
    });

    return response.data;
  };

  return {
    onDeposit,
    onWithdraw,
    depositError,
    depositSuccess,
    withdrawError,
    withdrawSuccess,
    account,
    proceedToDepositView,
    proceedToWithdrawView,
    deposit,
    withdraw,
    getWithdrawRequests,
    getAccount,
  };
}
