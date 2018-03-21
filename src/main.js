// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'

import ChatWidget from './components/ChatWidget.vue'
import ChatAdapterRocketChat from 'chat-adapter-rocketchat'
import deepmerge from 'deepmerge'
import EventEmitter from 'events'
import uidv4 from 'uuid/v4'

// Package name UniversalChatWidget defined in webpack.base.conf.js to be able to use window.UniversalChatWidget
export function Widget (config) {
  // config must be a json object with this configuration
  // *adapter: one of ActionCable or RocketChat
  // *element: css selector of element to replace in DOM when chat-widget renders
  // position: embedded|*bottom-right
  // showAvatars: *true|false
  // allowUploads: *true|false
  // poweredByText: '121 Services',
  // poweredByHost: 'https://121.services',
  // *adapterConfig: Object based on type of adapter. See ChatAdapterActionCable config as an example here:
  //    ChatAdapterActionCable.config:
  //    *backendUrl: 'http://localhost:3003/web'
  //    *initData: {endpoint: '/start',
  //                method: 'post',
  //                data: {*appId: YYY,
  //                       startValue,
  //                       user: {
  //                              id: ZZZ,
  //                              firstName: Jane,
  //                              lastName: Doe,
  //                              email: jane@doe.com,
  //                              username: jane.doe,
  //                              phone: 12125551234,
  //                              locale: en,
  //                              timezone: -5,
  //                              gender: female,
  //                              profilePicUrl: http://lorempixel.com/32/32/people
  //                      }
  //
  // sample action cable initilization:
  // a = new UniversalChatWidget.Widget({adapter: 'ActionCable', element:'#chat-widget', position:'bottom-right', showAvatars: true, allowUploads: true, adapterConfig: {backendUrl: 'http://localhost:3003/web', initData: {endpoint: '/start', method: 'post', data: {appId: '63015c58-13cf-438d-b5d9-d46adcba3139'}}}})

  // sample rocket chat initilization:
  // a = new UniversalChatWidget.Widget({adapter: 'RocketChat', element:'#chat-widget', position:'bottom-right', showAvatars: true, allowUploads: true, adapterConfig: {backendUrl: 'http://localhost:4000', mode: 'private', initData: {username: 'admin', password: 'admin', data: {channelId: 'GENERAL'}}}})

  var _widget
  var _parent
  var _widgetData = {
    position: config.position,
    element: config.element,
    showAvatars: config.showAvatars,
    allowUploads: config.allowUploads,
    poweredByText: config.poweredByText,
    poweredByHost: config.poweredByHost
  }
  var _eventBus = new EventEmitter()

  var _adapter = new ChatAdapterRocketChat()

  var _adapterConfig = config.adapterConfig

  // retrieve device fingerprint from (browser) local storage
  initAdapter()

  function isFalsey (value) {
    return (value === 'false' || value === false || value === 0 || value === '0')
  }

  function initAdapter () {
    // Let's init the communication with the backend
    // We complement _adapterConfig.initData with further data
    var enhancedConfig = {
      deviceIsoDatetime: new Date().toISOString(),
      language: navigator.language
    }

    if (_adapterConfig.initData.data === null) {
      _adapterConfig.initData.data = {}
    }
    _adapterConfig.initData.data = deepmerge(_adapterConfig.initData.data, enhancedConfig)

    _adapter.init(_adapterConfig)
        .then(json => {
          if (typeof json !== 'object') {
            // an error ocurred
            render(json)
          } else {
            var widgetConfig = {
              name: json.name || 'chat',
              displayName: json.display_name || 'Chat',
              avatarUrl: json.avatar_url || null,
              newUsersIntro: json.new_users_intro || '',
              user: json.user || {},
              lastMessages: json.last_messages || [],
              messageCount: json.message_count || 0,
              availableFrom: json.available_from || null,
              availableTo: json.available_to || null,
              unavailableMessage: json.unavailable_message || null
            }
            if (json.show_avatars !== undefined) {
              // showAvatars: whatever comes from the backend supersedes the initial config of the widget
              if (isFalsey(json.show_avatars)) {
                widgetConfig.showAvatars = false
                _widgetData.showAvatars = false
              } else {
                widgetConfig.showAvatars = true
                _widgetData.showAvatars = true
              }
            }
            if (json.allow_uploads !== undefined) {
              // allowUploads: whatever comes from the backend supersedes the initial config of the widget
              if (isFalsey(json.allow_uploads)) {
                widgetConfig.allowUploads = false
                _widgetData.allowUploads = false
              } else {
                widgetConfig.allowUploads = true
                _widgetData.allowUploads = true
              }
            }
            if (json.is_enabled !== undefined) {
              // isEnabled: defaults to true. Whatever comes from the backend supersedes that default
              if (isFalsey(json.is_enabled)) {
                widgetConfig.isEnabled = false
                _widgetData.isEnabled = false
              } else {
                widgetConfig.isEnabled = true
                _widgetData.isEnabled = true
              }
            }
            if (process.env.NODE_ENV === 'development' && widgetConfig.lastMessages.length === 0) {
              // use fake messages in development when there are no messages
              // widgetConfig.lastMessages = devMessages()
              devMessages()
            }

            widgetConfig = deepmerge(widgetConfig, _widgetData)
            render(widgetConfig)
          }
        },
        error => {
          console.error('Adapter init returned error:', error)
          render(error)
        })
    .catch(error => {
      console.error('Adapter init raised error:', error)
      render(error)
    })
  }

  function render (params) {
    if (typeof params !== 'object') {
      console.warn(`Chat failed to initialize: ${params}`)
      _eventBus.emit('ucw:error', `App ${_adapterConfig.initData.data.appId} failed to initialize: ${params}`)
      return false
    }
    if (params.isEnabled === false) {
      console.warn(`App ${_adapterConfig.initData.data.appId} is disabled in the backend. Widget will not show`)
      _eventBus.emit('ucw:error', `App ${_adapterConfig.initData.data.appId} is disabled in the backend. Widget will not show`)
      return false
    }

    // params contains properties to render the chat widget
    var _template = `<chat-widget ref="widget"
      @toggleVisibility="onToggleVisibility"
      @newUserMessage="onNewUserMessage"
      @requestOlderMessages="onRequestOlderMessages"
      :position="position"
      :user="user"
      :name="name"
      :displayName="displayName"
      :showAvatars="showAvatars"
      :allowUploads="allowUploads"
      :availableFrom="availableFrom"
      :availableTo="availableTo"
      :unavailableMessage="unavailableMessage"
      :avatarUrl="avatarUrl"
      :newUsersIntro="newUsersIntro"
      :messages="messages"
      :isOpen="isOpen"
      :isTyping="isTyping"
      :messageCount="messageCount"
      :unreadCount="unreadCount"
      :poweredByText="poweredByText"
      :poweredByHost="poweredByHost"/>
      </chat-widget>`

    Vue.config.productionTip = false
    /* eslint-disable no-new */
    _parent = new Vue({
      el: params.element,
      template: _template,
      components: {ChatWidget},
      data: {
        position: params.position || 'bottom-right',
        user: params.user,
        name: params.name,
        displayName: params.displayName,
        showAvatars: params.showAvatars,
        allowUploads: params.allowUploads,
        availableFrom: params.availableFrom || null,
        availableTo: params.availableTo || null,
        unavailableMessage: params.unavailableMessage || null,
        avatarUrl: params.avatarUrl,
        newUsersIntro: params.newUsersIntro,
        messages: params.lastMessages,
        isOpen: false,
        isTyping: false,
        messageCount: params.messageCount,
        unreadCount: 0,
        poweredByText: params.poweredByText,
        poweredByHost: params.poweredByHost
      },
      mounted: function () {
        if (this.messages.length === 0) {
          if (this.newUsersIntro.trim() !== '') {
            var welcome = {
              id: uidv4().replace(/-/g, ''),
              time: new Date().toISOString(),
              text: this.newUsersIntro,
              direction: '2',
              from: {
                username: this.displayName,
                avatar: this.avatarUrl
              }
            }
            this.messages.push(welcome)
          }
        }
      },
      methods: {
        open () {
          this.isOpen = true
        },
        close () {
          this.isOpen = false
        },
        sendMessage (text) {
          this.$refs.widget.sendMessage(text)
        },
        isEmbedded () {
          return this.position === 'embedded'
        },
        onToggleVisibility (isClosed) {
          this.isOpen = !isClosed
          if (this.isOpen) {
            // reset unread count
            _parent.unreadCount = 0
          }
        },
        onNewUserMessage (newMessage) {
          var data = {
            type: 'messages',
            from: {id: _adapterConfig.initData.data._channelId}
          }
          var merged = deepmerge(newMessage, data)
          // save it to local collection
          this.messages.push(merged)
          // and notify backend
          _adapter.send(merged)
        },
        onRequestOlderMessages () {
          if (this.messages[0].time !== undefined && this.messages[0].time !== null) {
            var data = {
              deviceId: _adapterConfig.initData.data._channelId,
              id: this.messages[0].id,
              time: this.messages[0].time
            }
            _adapter.requestOlderMessages(data)
                .then(response => {
                  if (response.status === 200) {
                    if (response.data.length > 0) {
                      this.messages = response.data.concat(this.messages)
                    }
                  } else {
                    console.error(response)
                  }
                })
                .catch(error => {
                  console.error(error)
                })
          }
        }
      }
    })

    _widget = _parent.$refs.widget
    _adapter.on('ucw:newRemoteMessage', (data) => {
      _widget.messages.push(data)
      if (!_widget.isOpen) {
        _parent.unreadCount += 1
      }
      // re-emit the event in case there are any subscribers attached to our widget
      _eventBus.emit('ucw:newRemoteMessage', data)
    })
    // signal loaded event
    _eventBus.emit('ucw:loaded')
  }

//
// helper functions
//

// use fake messages in development when there are no messages
  function devMessages () {
    // collection of messages to use in development if messages is empty
    const now = new Date().getTime()

    return [
      {
        id: 1,
        time: now - 600000000,
        from: {username: 'Tom Anderson', avatar: null},
        text: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
        direction: '1'
      },
      {
        id: 2,
        time: now - 60000000,
        from: {username: 'Tom Anderson', avatar: null},
        text: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
        direction: '2'
      },
      {
        id: 3,
        time: now - 6000000,
        from: {username: 'Tom Anderson', avatar: null},
        text: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
        direction: '1'
      },
      {
        id: 4,
        time: now - 600000,
        from: {username: 'Tom Anderson', avatar: null},
        text: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
        direction: '2'
      },
      {
        id: 5,
        time: now - 600000,
        from: {username: 'Tom Anderson', avatar: null},
        text: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
        direction: '2'
      },
      {
        id: 6,
        time: now - 600000,
        from: {username: 'Tom Anderson', avatar: null},
        text: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
        direction: '1'
      },
      {
        id: 7,
        time: now,
        from: {username: 'Tom Anderson', avatar: null},
        text: 'Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit...',
        direction: '2'
      }]
  }

//
// widget API (exposed/public) methods
//
  this.open = function () {
    _parent.open()
  }

  this.close = function () {
    _parent.close()
  }

  this.sendMessage = function (text) {
    _parent.sendMessage(text)
  }

  this.on = function (event, callback) {
    _eventBus.on(event, callback)
  }

  this.isEmbedded = function () {
    return _parent.isEmbedded()
  }

  this.isOpen = function () {
    return _parent.isOpen
  }
}
