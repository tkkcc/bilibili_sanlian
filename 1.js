// ==UserScript==
// @name         bilibili三连
// @version      0.0.8
// @include      https://www.bilibili.com/video/av*
// @include      https://www.bilibili.com/video/BV*
// @description  推荐投币收藏一键三连
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @namespace    https://greasyfork.org/users/164996
// ==/UserScript==
const position = document.querySelector('#arc_toolbar_report span.collect')
if (!position) return

const click = (s) => {
  if (!s) return
  if (s instanceof HTMLElement) s.click()
  else {
    const n = document.querySelector(s)
    if (!n) return
    n.click()
  }
  return true
}

new MutationObserver(function () {
  this.disconnect()
  const app = document.querySelector('div#app>div')
  let like = GM_getValue('like', true)
  let coin = GM_getValue('coin', 0)
  let collect = GM_getValue('collect', true)
  let collection = GM_getValue('collection', '输入收藏夹名')
  const css = `
  span#sanlian>div {
      display:none;
      position: absolute;
      color: SlateGray;
      background: white;
      border: 1px solid #e5e9ef;
      box-shadow: 0 2px 4px 0 rgba(0,0,0,.14);
      border-radius: 2px;
      padding:1em;
      cursor: default;
      z-index: 2;
  }
  span#sanlian span[id^=sanlian_] *{
      color: SlateGrey;
      cursor: pointer;
  }
  span#sanlian span[id^=sanlian_].sanlian_on *{
      color: SlateBlue;
  }
  span#sanlian span[id^=sanlian_]:hover *{
      color: DarkSlateBlue;
  }
  span#sanlian>div>input {
      border: 0;
      border-bottom: 1px solid
  }
  span#sanlian span#sanlian_coin i{
    margin:0;
  }
  .bili-dialog-m{
    display:block;
  }`
  const style = document.createElement('style')
  style.type = 'text/css'
  style.appendChild(document.createTextNode(css))
  document.head.appendChild(style)
  position.insertAdjacentHTML(
    'afterend',
    `<span id=sanlian title=推荐硬币收藏><i class=van-icon-tuodong></i>三连
    <div>
        <span id=sanlian_like class=${like ? 'sanlian_on' : ''}>
            <i class=van-icon-videodetails_like ></i>
        </span>
        <span id=sanlian_coin class=${coin > 0 ? 'sanlian_on' : ''}>
            <i class=van-icon-videodetails_throw></i><span>x${coin}</span>
        </span>
        <span id=sanlian_collect class=${collect ? 'sanlian_on' : ''}>
            <i class=van-icon-videodetails_collec></i>
        </span>
        <input type="text" value=${collection}>
      </div>
    </span>`
  )
  const s = document.querySelector('#sanlian')
  const i = document.querySelector('#sanlian>i')
  const x = document.querySelector('#sanlian>div')
  const like_btn = document.querySelector('#sanlian_like')
  const coin_btn = document.querySelector('#sanlian_coin')
  const coin_value = document.querySelector('#sanlian_coin span')
  const collect_btn = document.querySelector('#sanlian_collect')
  const collect_value = document.querySelector('#sanlian input')
  let dialog_style = style.sheet.rules
  dialog_style = dialog_style[dialog_style.length - 1].style
  like_btn.addEventListener('click', function () {
    const c = this.classList
    like = !like
    c.toggle('sanlian_on')
    GM_setValue('like', like)
  })
  coin_btn.addEventListener('click', function (e) {
    const c = this.classList
    coin = (coin + 1) % 3
    coin_value.innerHTML = 'x' + coin
    if (coin !== 2) c.toggle('sanlian_on')
    GM_setValue('coin', coin)
  })
  coin_btn.addEventListener('contextmenu', function (e) {
    e.preventDefault()
    const c = this.classList
    coin = (coin + 2) % 3
    coin_value.innerHTML = 'x' + coin
    if (coin !== 1) c.toggle('sanlian_on')
    GM_setValue('coin', coin)
  })
  collect_btn.addEventListener('click', function () {
    const c = this.classList
    collect = !collect
    c.toggle('sanlian_on')
    GM_setValue('collect', collect)
  })
  collect_value.addEventListener('keyup', function () {
    collection = collect_value.value
    GM_setValue('collection', collection)
  })
  s.addEventListener('mouseover', () => {
    x.style.display = 'block'
  })
  s.addEventListener('mouseout', () => {
    x.style.display = 'none'
  })
  s.addEventListener('click', async (e) => {
    let t
    // http request timeout
    const timeout = 3500
    if (![s, i].includes(e.target)) return
    dialog_style.display = 'none'
    let dt = setTimeout(() => {
      dialog_style.display = 'block'
    }, timeout)
    // like
    if (like) click('#arc_toolbar_report span.like:not(.on)')
    // coin
    if (coin > 0 && click('#arc_toolbar_report span.coin:not(.on)')) {
      await new Promise((resolve) => {
        new MutationObserver(function () {
          this.disconnect()
          if (coin === 1) click('.mc-box.left-con')
          else click('.mc-box.right-con')
          t = setTimeout(() => {
            click('div.bili-dialog-m div.coin-operated-m i.close')
          }, timeout)
          new MutationObserver(function (e) {
            this.disconnect()
            clearTimeout(t)
            resolve()
          }).observe(app, { childList: true })
          setTimeout(() => {
            click('div.coin-bottom > span')
          }, 0)
        }).observe(app, { childList: true, subtree: true })
      })
    }
    // collect
    if (collect && click('#arc_toolbar_report span.collect')) {
      await new Promise((resolve) => {
        new MutationObserver(function (e) {
          if (e[0].target.nodeName !== 'UL') return
          this.disconnect()
          t = document.querySelectorAll('div.collection-m div.group-list input+i')
          // match or first
          t =
            [...t].find((i) => i.nextElementSibling.textContent.trim() === collection) ||
            t[0]
          // already collect
          if (!t || t.previousElementSibling.checked || !click(t)) {
            click('i.close')
            return resolve()
          }
          // offline fallback
          t = setTimeout(() => {
            click('i.close')
          }, timeout)
          // wait for dialog close
          new MutationObserver(function () {
            this.disconnect()
            clearTimeout(t)
            resolve()
          }).observe(app, { childList: true })
          const b = document.querySelector('div.collection-m button.submit-move')
          if (b.hasAttribute('disabled')) {
            new MutationObserver(function () {
              this.disconnect()
              click(b)
            }).observe(b, { attributes: true })
          } else click(b)
        }).observe(app, { childList: true, subtree: true })
      })
    }
    clearTimeout(dt)
    dialog_style.display = 'block'
  })
}).observe(position, { attributes: true })
