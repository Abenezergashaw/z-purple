export function useConfig() {
  const useBonusState = ref(false);
  const MAX_WIN = computed(() => (useBonusState.value ? 10000 : 1000000));
  const TAX = 0.15;
  watch(MAX_WIN, (newval) => console.log(newval));

  const toggleUseBonus = () => {
    useBonusState.value = !useBonusState.value;
    console.log(useBonusState.value, MAX_WIN.value);
  };

  return {
    MAX_WIN,
    TAX,
    toggleUseBonus,
    useBonusState,
  };
}
