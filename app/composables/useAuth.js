import { ref } from "vue";
import axios from "axios";

const STORAGE_KEY = "isLoggedIn";

const loggedIn = ref(false);
const user = ref(null);
const rBalance = ref(0);
const bBalance = ref(0);
let saved = null;
if (process.client) {
  saved = localStorage.getItem(STORAGE_KEY);
}
if (saved !== null) {
  loggedIn.value = saved === "true";
}

const loginError = ref(null);
const registerError = ref(null);

export function useAuth() {
  watch(
    loggedIn,
    (val) => {
      if (process.client) {
        localStorage.setItem(STORAGE_KEY, String(val));
      }
    },
    { immediate: true },
  );

  const register = async (form) => {
    const { url } = useUrl();
    const { toggleModal } = useModal();

    registerError.value = null;

    try {
      const response = await axios.post(
        `${url}/auth/register`,
        {
          username: form.phone,
          password: form.password,
          confirmPassword: form.confirmPassword,
        },
        { withCredentials: true },
      );

      if (!response?.data?.error) {
        return (registerError.value = response.data.result);
      }

      const ok = checkSession();
      if (ok) {
        toggleModal("register");
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || "Something went wrong";
      registerError.value = serverMessage;
    }
  };

  const login = async (form) => {
    const { url } = useUrl();
    const { toggleModal } = useModal();

    loginError.value = null;

    const response = await axios.post(
      `${url}/auth/login`,
      {
        username: form.phone,
        password: form.password,
      },
      { withCredentials: true },
    );

    if (response.data?.error) {
      loginError.value = response.data.message;
      return;
    }

    const ok = checkSession();
    if (ok) {
      // if (!loggedIn.value) {
      toggleModal("login");
      // }
    }
  };

  const loginDesktop = async (form) => {
    const { url } = useUrl();
    const { toggleModal } = useModal();

    loginError.value = null;

    const response = await axios.post(
      `${url}/auth/login`,
      {
        username: form.phone,
        password: form.password,
      },
      { withCredentials: true },
    );

    if (response.data.error) {
      loginError.value = response.data.message;
      return;
    }

    const ok = checkSession();
    if (!ok) {
      // if (!loggedIn.value) {
      toggleModal("login");
      // }
    }
  };

  const checkSession = async () => {
    const { url } = useUrl();

    try {
      const res = await axios.get(`${url}/auth/status`, {
        withCredentials: true,
      });

      if (res.data.loggedIn) {
        user.value = res.data.user;
        loggedIn.value = true;
        bBalance.value = user.bBalance;
        rBalance.value = user.rBalance;
        return true;
      }

      user.value = null;
      loggedIn.value = false;
      return false;
    } catch {
      user.value = null;
      loggedIn.value = false;
      return false;
    }
  };

  const logout = async () => {
    const { url } = useUrl();
    await axios.post(`${url}/auth/logout`, {}, { withCredentials: true });
    user.value = null;
    loggedIn.value = false;
  };

  return {
    user,
    loggedIn,
    rBalance,
    bBalance,
    loginError,
    registerError,
    register,
    login,
    loginDesktop,
    checkSession,
    logout,
  };
}
