<template>
  <div class="chat-attachment">
    <chat-attachment-image v-if="attachment.image_url" :source="attachment.image_url"></chat-attachment-image>
    <p class="attachment-title" v-if="attachment.title" v-once>{{attachment.title}}</p>
    <small class="attachment-description" v-if="attachment.description" v-once>{{attachment.description}}</small>
    <a :href="attachment.title_link" download>Download</a>
  </div>
</template>

<script>
  import ChatAttachmentImage from './ChatAttachmentImage'

  export default {
    name: 'ChatAttachment',
    components: {
        ChatAttachmentImage
    },
    data () {
      return {}
    },
    props: {
      attachment: {
        default: null,
        type: Object
      }
    },
    methods: {

    }
  }
</script>`

<style scoped>
  .attachment-title {
    margin: 0;
  }
</style>
