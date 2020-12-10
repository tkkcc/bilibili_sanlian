// ==UserScript==
// @name         bilibili三连
// @version      0.0.13
// @include      https://www.bilibili.com/video/av*
// @include      https://www.bilibili.com/video/BV*
// @include      https://www.bilibili.com/medialist/play/*
// @description  推荐投币收藏一键三连
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @namespace    https://greasyfork.org/users/164996
// ==/UserScript==
const click = s => {
  if (!s) return
  if (s instanceof HTMLElement) s.click()
  else {
    const n = document.querySelector(s)
    if (!n) return
    n.click()
  }
  return true
}
const waitForAll = (selectors, delay = 500, timeout = 50000) =>
  new Promise(resolve => {
    let max_times = 1 + timeout / delay
    let times = 0
    let nodes
    const f = () => {
      nodes = selectors.map(i => document.querySelector(i))
      times = times + 1
      if (Object.values(nodes).every(v => v != null)) {
        resolve(nodes)
      } else if (times >= max_times) {
        resolve([])
      } else {
        setTimeout(f, delay)
      }
    }
    f()
  })
const state = {
  get(k) {
    return this.state[k]
  },
  set(k, v) {
    this.state[k] = v
    this.render()
    GM_setValue('state', JSON.stringify(this.state))
  },
  toggle(k) {
    this.set(k, !this.state[k])
  },
  state: {},
  node: {},
  default_state: {
    like: true,
    coin: 0,
    collect: true,
    collection: '输入收藏夹名'
  },
  render() {
    const { like, coin, coin_value, collect, collection } = this.node
    const get = this.get.bind(this)
    if (get('like')) like.classList.add('sanlian_on')
    else like.classList.remove('sanlian_on')
    if (get('coin')) coin.classList.add('sanlian_on')
    else coin.classList.remove('sanlian_on')
    coin_value.innerHTML = 'x' + get('coin')
    if (get('collect')) collect.classList.add('sanlian_on')
    else collect.classList.remove('sanlian_on')
    collection.value = get('collection')
  },
  load(state_str) {
    try {
      this.state = JSON.parse(state_str)
      for (let k of Object.keys(this.default_state)) {
        if (typeof this.default_state[k] != typeof this.state[k]) {
          throw `${k}'s type is not same as default`
        }
      }
    } catch (e) {
      this.state = { ...this.default_state }
    }
    this.render()
  },
  addStyle() {
    const css = `
      #sanlian > div {
        display: none;
        position: absolute;
        color: SlateGray;
        background: white;
        border: 1px solid #e5e9ef;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.14);
        border-radius: 2px;
        padding: 1em;
        cursor: default;
        z-index: 2;
      }
      #sanlian_like {
        margin: 0 1em 0 0;
      }
      #sanlian_coin {
        margin: 0 1em 0 0;
      }
      #sanlian input {
        color: SlateGrey;
        cursor: text;
      }
      #sanlian span[id^='sanlian_'] * {
        color: SlateGrey;
        cursor: pointer;
        user-select: none;
      }
      #sanlian span[id^='sanlian_'].sanlian_on * {
        color: SlateBlue;
      }
      #sanlian span[id^='sanlian_']:hover * {
        color: DarkSlateBlue;
      }
      #sanlian > div > input {
        border: 0;
        border-bottom: 1px solid;
      }
      #sanlian span#sanlian_coin i {
        margin: 0;
      }
      #sanlian > i.iconfont {
        margin-left: -1em;
        transform-origin: right;
        transform: scale(0.4, 0.8);
        display: inline-block;
      }
      .video-toolbar .ops > span {
        width: 88px;
      }
      ${this.selector.coin_dialog}, ${this.selector.collect_dialog} {
        display: block;
      }
    `
    const style = document.createElement('style')
    style.type = 'text/css'
    style.appendChild(document.createTextNode(css))
    document.head.appendChild(style)

    const rules = style.sheet.rules
    this.node.dialog_style = rules[rules.length - 1].style
    // remove leading space of coin text
    if (!this.is_medialist) {
      const coin_text = document.querySelector(this.selector.coin + ' i')
        .nextSibling
      if (coin_text.nodeType == Node.TEXT_NODE) {
        coin_text.textContent = coin_text.textContent.trim()
      }
    }
  },
  addNode() {
    const { collect } = this.node
    const { selector } = this
    const sanlian = collect.cloneNode(true)
    const sanlian_icon = sanlian.querySelector('i')
    const sanlian_text =
      sanlian_icon.nextElementSibling || sanlian_icon.nextSibling
    sanlian.id = 'sanlian'
    sanlian.classList.remove('on')
    sanlian.title = '推荐硬币收藏'
    const sanlian_canvas = sanlian.querySelector('canvas')
    if (sanlian_canvas) sanlian_canvas.remove()
    sanlian_icon.innerText = this.is_medialist ? '' : ''
    sanlian_icon.classList.remove('blue')
    sanlian_icon.classList.add('van-icon-tuodong')
    sanlian_text.textContent = '三连'
    const sanlian_panel = document.createElement('div')
    for (const name of ['like', 'coin', 'collect']) {
      const wrapper = document.createElement('span')
      wrapper.id = `sanlian_${name}`
      const node = document.querySelector(selector[name] + ' i').cloneNode(true)
      node.classList.remove('blue')
      wrapper.appendChild(node)
      if (name == 'coin') {
        wrapper.insertAdjacentHTML('beforeend', `<span>x${state.coin}</span>`)
      }
      sanlian_panel.appendChild(wrapper)
      this.node[name] = wrapper
    }
    sanlian_panel.insertAdjacentHTML('beforeend', `<input type="text">`)
    sanlian.appendChild(sanlian_panel)
    collect.parentNode.insertBefore(sanlian, collect.nextSibling)
    Object.assign(this.node, {
      coin_value: document.querySelector('#sanlian_coin span'),
      collection: document.querySelector('#sanlian input'),
      sanlian,
      sanlian_icon,
      sanlian_text,
      sanlian_panel
    })
  },
  addListener() {
    const {
      app,
      like,
      coin,
      collect,
      collection,
      sanlian,
      sanlian_icon,
      sanlian_text,
      sanlian_panel,
      dialog_style
    } = this.node
    const selector = this.selector
    const get = this.get.bind(this)
    const set = this.set.bind(this)
    const toggle = this.toggle.bind(this)
    like.addEventListener('click', function() {
      toggle('like')
    })
    coin.addEventListener('click', function() {
      set('coin', (get('coin') + 1) % 3)
    })
    collect.addEventListener('click', function() {
      toggle('collect')
    })
    collection.addEventListener('keyup', function() {
      set('collection', collection.value)
    })
    sanlian.addEventListener('mouseover', () => {
      sanlian_panel.style.display = 'flex'
    })
    sanlian.addEventListener('mouseout', () => {
      sanlian_panel.style.display = 'none'
    })
    sanlian.addEventListener('click', async e => {
      const timeout = 3500
      if (![sanlian, sanlian_icon, sanlian_text].includes(e.target)) return
      dialog_style.display = 'none'
      const fallback = setTimeout(() => {
        dialog_style.display = 'block'
      }, timeout)
      if (get('like')) click(selector.like_off)
      if (get('coin') > 0 && click(selector.coin_off)) {
        await new Promise(resolve => {
          new MutationObserver(function(e) {
            this.disconnect()
            if (get('coin') === 1) click(selector.coin_left)
            else click(selector.coin_right)
            const fallback = setTimeout(() => {
              click(selector.coin_close)
            }, timeout)
            new MutationObserver(function() {
              this.disconnect()
              clearTimeout(fallback)
              resolve()
            }).observe(app, { childList: true })
            setTimeout(() => {
              click(selector.coin_yes)
            }, 0)
          }).observe(app, { childList: true })
        })
      }
      if (get('collect') && click(selector.collect)) {
        await new Promise(resolve => {
          new MutationObserver(function(e) {
            if (e[0].target.nodeName !== 'UL') return
            this.disconnect()
            const choices = document.querySelectorAll(
              'div.collection-m div.group-list input+i'
            )
            // match or first
            const choice =
              [...choices].find(
                i =>
                  i.nextElementSibling.textContent.trim() === get('collection')
              ) || choices[0]
            // already collect
            if (
              !choice ||
              choice.previousElementSibling.checked ||
              !click(choice)
            ) {
              click('i.close')
              return resolve()
            }
            const fallback = setTimeout(() => {
              click('i.close')
            }, timeout)
            // wait for dialog close
            new MutationObserver(function() {
              this.disconnect()
              clearTimeout(fallback)
              resolve()
            }).observe(app, { childList: true })
            const yes = document.querySelector(selector.collect_yes)
            if (yes.hasAttribute('disabled')) {
              new MutationObserver(function() {
                this.disconnect()
                click(yes)
              }).observe(yes, { attributes: true })
            } else click(yes)
          }).observe(app, { childList: true, subtree: true })
        })
      }
      clearTimeout(fallback)
      dialog_style.display = 'block'
    })
  },
  selector: {
    app: 'div#app>div.v-wrap',
    people: 'span.bilibili-player-video-info-people-text',
    like: '#arc_toolbar_report span.like',
    coin: '#arc_toolbar_report span.coin',
    collect: '#arc_toolbar_report span.collect',
    like_off: '#arc_toolbar_report span.like:not(.on)',
    coin_off: '#arc_toolbar_report span.coin:not(.on)',
    collect_off: '#arc_toolbar_report span.collect:not(.on)',
    coin_left: '.mc-box.left-con',
    coin_right: '.mc-box.right-con',
    coin_close: 'div.bili-dialog-m div.coin-operated-m i.close',
    coin_yes: 'div.coin-bottom > span',
    collect_yes: 'div.collection-m button.submit-move',
    coin_dialog: '.bili-dialog-m',
    collect_dialog: '.bili-dialog-m',
  },
  selector_in_medialist: {
    app: 'div.container',
    people: 'span.bilibili-player-video-info-people-text',
    like: '#playContainer div.play-options > ul > li:nth-child(1)',
    coin: '#playContainer div.play-options > ul > li:nth-child(2)',
    collect: '#playContainer div.play-options > ul > li:nth-child(3)',
    like_off:
      '#playContainer div.play-options > ul > li:nth-child(1) > i:not(.blue)',
    coin_off:
      '#playContainer div.play-options > ul > li:nth-child(2) > i:not(.blue)',
    collect_off:
      '#playContainer div.play-options > ul > li:nth-child(3) > i:not(.blue)',
    coin_left: '.play-one-coin',
    coin_right: '.play-two-coin',
    coin_close: '.play-coin-close',
    coin_yes: '.play-coin-btn',
    collect_yes: 'div.collection-m button.submit-move',
    coin_dialog: '.play-coin-bg',
    collect_dialog: '.collection-bg',
  },
  async init() {
    this.is_medialist = window.location.href.includes('/medialist/')
    this.selector = this.is_medialist
      ? this.selector_in_medialist
      : this.selector
    let { collect, app, people } = this.selector
    ;[collect, app, people] = await waitForAll([collect, app, people])
    if (!collect) return
    Object.assign(this.node, { collect, app })

    this.addStyle()
    this.addNode()
    this.addListener()

    this.load(GM_getValue('state'))
    GM_addValueChangeListener('state', (name, old_state, new_state) => {
      if (JSON.stringify(this.state) == new_state) return
      this.load(new_state)
    })
  }
}
state.init()
