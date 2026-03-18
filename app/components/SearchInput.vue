<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  search: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:search"]);

const localValue = ref(props.search);

// keep in sync if parent updates prop
watch(
  () => props.search,
  (val) => {
    localValue.value = val;
  },
);

// emit on change (debounced)
let timer = null;
watch(localValue, (val) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    emit("update:search", val);
  }, 300);
});
</script>

<template>
  <div class="w-full">
    <input
      v-model="localValue"
      type="text"
      placeholder="Search by ticket ID..."
      class="w-[80%] md:w-[300px] px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20 transition"
    />
  </div>
</template>
