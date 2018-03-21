<template>
  <img :src="source" height="200" class="chat-attachment-image">
</template>

<script>
  export default {
    name: 'ChatAttachmentImage',
    components: {

    },
    data () {
      return {}
    },
    props: {
      source: {
        default: null,
        type: String
      }
    },
    methods: {

    }
  }
</script>`

<style scoped>
  .chat-attachment-image {
    max-width: 100%;
    max-height: 200px;  
  }
</style>
