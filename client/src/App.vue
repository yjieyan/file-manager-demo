<template>
  <div id="app">
    <FileManager />
  </div>
</template>

<script>
import FileManager from './components/FileManager.vue'

export default {
  name: 'App',
  components: {
    FileManager
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
}

#app {
  height: 100vh;
}
</style>