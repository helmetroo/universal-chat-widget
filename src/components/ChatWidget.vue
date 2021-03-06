<template>
  <div :class="classObject">
    <transition name="fade">
      <div id="chat-121" v-show="isVisible">
        <header class="clearfix" @click="toggleVisibility">
          <a v-if="!isEmbedded" href="#" class="chat-close">X</a>
          <h4>{{displayName}}</h4>
        </header>
        <div v-if="isAvailable" class="chat">
          <div class="chat-history" ref="chatHistory" @scroll="onScroll">
            <chat-message v-for="message in messages" :key="message.id"
                          :message="message"
                          :showAvatar="showAvatars"
                          @postback="onPostback">
            </chat-message>
            <typing-indicator v-if="isTyping && isVisible"></typing-indicator>
          </div>
          <div class="inputs">
            <textarea placeholder="Type your message…" ref="textArea" @keydown="handleInput"/>
            <button v-if="allowUploads" class="upload" @click="trigger">
              <input class="upload-input" type="file" ref="fileInput"/>
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
                <path fill="none" fill-rule="evenodd" stroke="#212126"
                      d="M11.312 6.213l-6.103 6.486c-1.612 1.726-1.612 4.498 0 6.224 1.61 1.728 4.198 1.728 5.808 0l8.78-8.751c.977-1.046 1.344-2.36.578-3.61C20.007 5.963 18.937 5 17.656 5a3.39 3.39 0 0 0-2.593 1.213s-4.938 5.287-5.36 5.756c-.422.469-.656 1.172-.515 1.656.14.484.812.969 1.28.969.47 0 1.313-.313 1.648-.64l3.759-4.028"></path>
              </svg>
            </button>
          </div>
        </div>
        <div v-if="!isAvailable" class="chat-unavailable">
          <p>{{ unavailableMessage }}</p>
        </div>
        <div v-if="poweredByText !==''" class="powered-by">
          <a :href="poweredByHref"
             target="_blank">{{ poweredByText }}</a>
        </div>
      </div>
    </transition>
    <template v-if="!isEmbedded">
      <transition name="fade">
        <div id="chat-121-avatar" v-show="!isVisible">
          <span class="chat-message-counter" v-if="unreadCount > 0">{{unreadCount}}</span>
          <template v-if="avatarUrl !== null">
            <img :src=avatarUrl @click="toggleVisibility"/>
          </template>
          <template v-if="avatarUrl === null">
            <chat-bubble @toggleVisibility="toggleVisibility"/>
          </template>
        </div>
      </transition>
    </template>
  </div>
</template>

<script>
  import uidv4 from 'uuid/v4'
  import ChatMessage from './ChatMessage'
  import TypingIndicator from './TypingIndicator'
  import ChatBubble from './ChatBubble'

  export default {
    name: 'ChatWidget',
    components: {
      ChatMessage,
      TypingIndicator,
      ChatBubble
    },
    props: {
      position: {
        type: String,
        default: 'bottom-right'
      },
      user: {
        type: Object,
        default: {}
      },
      showAvatars: {
        type: Boolean,
        default: true
      },
      allowUploads: {
        type: Boolean,
        default: true
      },
      name: {
        type: String,
        default: 'chat'
      },
      displayName: {
        type: String,
        default: 'Chat'
      },
      avatarUrl: {
        type: String,
        default: null
      },
      newUsersIntro: {
        type: String,
        default: ''
      },
      messages: {
        type: Array
      },
      isOpen: {
        type: Boolean,
        default: false
      },
      isTyping: {
        type: Boolean,
        default: false
      },
      messageCount: {
        type: Number,
        default: 0
      },
      unreadCount: {
        type: Number,
        default: 0
      },
      availableFrom: {
        type: String,
        default: null
      },
      availableTo: {
        type: String,
        default: null
      },
      unavailableMessage: {
        type: String,
        default: 'We are sorry: chat is unavailable at the moment.'
      },
      poweredByText: {
        type: String,
        default: 'Powered by 121 Services'
      },
      poweredByHost: {
        type: String,
        default: 'https://121.services'
      }
    },
    mounted: function () {
      this.scrollToBottom()
    },
    updated: function () {
      this.scrollToBottom()
    },
    computed: {
      classObject () {
        return {
          'ucw': true,
          'bottom-right': (this.position.toLowerCase() === 'bottom-right'),
          'embedded': (this.position.toLowerCase() === 'embedded')
        }
      },
      isEmbedded () {
        return (this.position.toLowerCase() === 'embedded')
      },
      isVisible () {
        return (this.isOpen || this.position.toLowerCase() === 'embedded')
      },
      isAvailable () {
        if (this.availableFrom === null || this.availableTo === null) {
          return true
        } else {
          return (Date.now() >= Date.parse(this.availableFrom) && Date.now() <= Date.parse(this.availableTo))
        }
      },
      poweredByHref () {
        var loc = window.location
        return `${this.poweredByHost}?utm_source=chat-widget&utm_medium=${loc.hostname}`
      }
    },
    methods: {
      toggleVisibility () {
        if (!(this.position.toLowerCase() === 'embedded')) {
          this.$emit('toggleVisibility', this.isOpen)
        }
      },
      trigger () {
        this.$refs.fileInput.click()
      },
      handleInput (e) {
        if (e.keyCode === 13) {
          var textArea = e.target
          if (textArea.value.trim() !== '') {
            this.sendMessage(textArea.value.trim())
          }
          textArea.value = ''
          textArea.setSelectionRange(0, 0)
          textArea.blur()
        }
      },
      sendMessage (text) {
        var newMessage = {
          id: uidv4().replace(/-/g, ''),
          time: new Date().toISOString(),
          text: text,
          direction: '1',
          from: {
            username: this.user.username === undefined ? 'User' : this.user.username,
            avatar: this.user.avatar === undefined ? null : this.user.avatar
          }
        }
        this.$emit('newUserMessage', newMessage)
        // scroll to last message
        this.$refs.chatHistory.scrollTop = this.$refs.chatHistory.scrollHeight
      },
      scrollToBottom () {
        if (this.$refs.chatHistory !== undefined) {
          // scroll to last message
          this.$refs.chatHistory.scrollTop = this.$refs.chatHistory.scrollHeight
        }
        if (this.$refs.textArea !== undefined) {
          this.$refs.textArea.focus()
        }
      },
      onScroll (e) {
        if (e.target.scrollTop === 0) {
          // see if there are older messages to read from server
          if (this.messageCount > this.messages.length) {
            // refresh older messages
            this.$emit('requestOlderMessages')
          }
        }
      },
      onPostback: function (data) {
        // a button action was triggered in a message or carousel
        var newMessage = {
          id: uidv4().replace(/-/g, ''),
          time: new Date().toISOString(),
          text: data.text,
          userAction: data.userAction,
          direction: '1',
          from: {
            username: 'User',
            avatar: null
          }
        }
        this.$emit('newUserMessage', newMessage)
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  /* ---------- GENERAL ---------- */

  .ucw {
    font-size: 62.5%;
    z-index: 1000;
  }

  .ucw h4 {
    line-height: 1.5em;
    margin: 0;
  }

  .ucw img {
    border: 0;
    display: block;
    height: auto;
    max-width: 100%;
  }

  .ucw .clearfix {
    *zoom: 1;
  }

  /* For IE 6/7 */
  .ucw .clearfix:before, .ucw .clearfix:after {
    content: "";
    display: table;
  }

  .ucw .clearfix:after {
    clear: both;
  }

  /* ---------- 121-CHAT ---------- */

  @media (min-height: 480px) {
    #chat-121 {
      height: 450px;
    }

    #chat-121 .chat-history {
      height: 325px;
    }
  }

  @media (min-height: 600px) {
    #chat-121 {
      height: 550px;
    }

    #chat-121 .chat-history {
      height: 425px;
    }
  }

  @media (min-height: 900px) {
    #chat-121 {
      height: 650px;
    }

    #chat-121 .chat-history {
      height: 525px;
    }
  }

  @media (min-width: 320px) and (orientation: landscape) {
    #chat-121 {
      height: 320px;
    }

    #chat-121 .chat-history {
      height: 195px;
    }
  }

  @media (min-width: 768px) and (orientation: landscape) {
    #chat-121 {
      height: 650px;
    }

    #chat-121 .chat-history {
      height: 525px;
    }
  }

  @media (min-width: 320px) {
    #chat-121 {
      width: 300px;
    }
  }

  @media (min-width: 360px) {
    #chat-121 {
      width: 340px;
    }
  }

  @media (min-width: 768px) {
    #chat-121 {
      width: 370px;
    }
  }

  .bottom-right {
    position: fixed;
    bottom: 0;
    right: 0;
    padding-bottom: 1.5em;
    padding-right: 1.5em;
    border-radius: 5px 5px 0 0;
  }

  .embedded {
    position: inherit;
  }

  #chat-121 {
    font-size: calc(0.6em + 1vw);;
    z-index: 10;
    display: flex;
    flex-direction: column;
    font-family: Raleway, Arial, Helvetica, sans-serif;
    background-color: #f5f7fa;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
    border-radius: 5px 5px 0 0;
  }

  #chat-121 header {
    background: #EA883B;
    border-radius: 5px 5px 0 0;
    color: #fff;
    cursor: pointer;
    padding: 12px 24px;
  }

  #chat-121 h4 {
    font-size: 1em;
  }

  #chat-121 h5 {
    font-size: 1em;
  }

  .chat-message-counter {
    background: #e62727;
    border: 1px solid #fff;
    color: #fff;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
    height: 28px;
    left: 0;
    line-height: 28px;
    margin: -10px 0 0 -10px;
    position: absolute;
    text-align: center;
    top: 0;
    width: 28px;
    z-index: -10;
    font-family: Raleway, Arial, Helvetica, sans-serif;
  }

  #chat-121 .chat-close {
    background: #EA883B;
    border-radius: 50%;
    color: #fff;
    display: block;
    float: right;
    font-size: 1em;
    height: 1.3em;
    line-height: 1.3em;
    margin: 2px 0 0 0;
    text-align: center;
    width: 1.3em;
    text-decoration: none;
  }

  #chat-121 .chat-close:hover {
    background: #de261d;
  }

  #chat-121 .chat {
    background: #fff;
    flex: 1;
  }

  #chat-121 .chat-history {
    overflow-y: scroll;
  }

  #chat-121 .chat-feedback {
    font-style: italic;
    margin: 0 0 0 80px;
  }

  #chat-121 .inputs {
    padding: 8px;
    position: relative;
  }

  #chat-121 .chat-unavailable {
    font-size: 2em;
    text-align: center;
    padding: 50px 10px 10px 10px;
  }

  #chat-121 .inputs textarea {
    font-size: 0.8em;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 8px;
    padding-right: 22px;
    outline: none;
    width: 100%;
    height: 50px;
    overflow-y: hidden;
    resize: none;
    box-sizing: border-box;
  }

  #chat-121 .inputs .upload {
    position: absolute;
    right: 15px;
    top: 10px;
    z-index: 2;
    background-color: hsla(0, 0%, 100%, .9);
    border-radius: 50%;
    width: 26px;
    height: 26px;
    cursor: pointer;
    border: none;
  }

  #chat-121 .inputs .upload-input {
    display: none;
  }

  #chat-121-avatar {
    position: fixed;
    bottom: 0;
    right: 0;
    cursor: pointer;
    z-index: 0;
    max-width: 58px;
    height: auto;
  }

  #chat-121 .powered-by {
    background: #fff;
    margin-top: auto;
    font-size: 0.7em;
    color: #fff;
    /*text-shadow: 0 .1em .6em rgba(0, 0, 0, .7);*/
    padding-right: 1em;
  }

  #chat-121 .powered-by a {
    float: right;
  }

  /* TRANSITIONS */
  .fade-enter-active, .fade-leave-active {
    transition: opacity .5s
  }

  .fade-enter, .fade-leave-to {
    opacity: 0
  }

</style>
