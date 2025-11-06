<template>
  <div 
    class="context-menu" 
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <div 
      v-for="(item, index) in items" 
      :key="index"
      class="context-menu-item"
      @click="handleItemClick(item)"
    >
      {{ item.label }}
    </div>
  </div>
</template>

<script>
import { onMounted, onUnmounted } from 'vue'

export default {
  name: 'ContextMenu',
  props: {
    x: Number,
    y: Number,
    items: Array
  },
  emits: ['close'],
  setup(props, { emit }) {
    const handleItemClick = (item) => {
      if (item.action) {
        item.action()
      }
      emit('close')
    }

    const handleClickOutside = () => {
      emit('close')
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      handleItemClick
    }
  }
}
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1001;
  min-width: 120px;
}

.context-menu-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.9rem;
}

.context-menu-item:hover {
  background: #f0f0f0;
}

.context-menu-item:not(:last-child) {
  border-bottom: 1px solid #f0f0f0;
}
</style>