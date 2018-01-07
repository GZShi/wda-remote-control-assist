export async function sleep(tick) {
  return new Promise(resolve => setTimeout(resolve, tick))
}

// 加载图片
export async function loadImage(url) {
  return new Promise((resolve, reject) => {
    let image = new Image()
    image.src = url
    image.onload = () => resolve(image)
    image.onerror = () => reject(`load image failed`)
  })
}

// 获取截图并展示
export async function drawScreenshot(vm) {
  let ctx = vm.screenCtx
  let { status, value, sessionId } = await fetch('/wda-api/screenshot').then(res => res.json())
  if (status != 0) throw 'get screenshot failed'

  let img = await loadImage(`data:image/png;base64,${value}`)

  ctx.drawImage(img, 0, 0, img.width, img.height)
  vm.session = sessionId

  return img
}

// 检测棋子的底部中心位置
export function detectChessPiecePos(canvas) {
  // find chess piece position
  // #37365f
  let ctx = canvas.getContext('2d')
  let idata = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let bottoms = []

  for (let y = 400; y < 900; ++y) {
    for (let x = 0; x < idata.width; ++x) {
      let base = (y * idata.width + x) * 4
      let [r, g, b, a] = idata.data.slice(base, base + 4)
      if (Math.abs(r - 0x37) < 3 && Math.abs(g - 0x36) < 3 && Math.abs(b - 0x5f) < 3) {
        bottoms.push({x, y})
      }
    }
  }

  let len = bottoms.length
  if (len <= 0) return { x: 0, y: 0 }

  let totalBottom = bottoms.reduce((prev, curr) => {
    return {
      x: prev.x + curr.x,
      y: prev.y + curr.y
    }
  })

  return {
    x: totalBottom.x / len,
    y: totalBottom.y / len
  }
}

export function rand(min, max) {
  return Math.random() * (max - min) + min
}

// 发送tapAndHold指令
export async function tapAndHold(vm, x, y, duration) {
  x += rand(-10, 10)
  y += rand(-14, 23)
  console.log('tap and hold', x, y, duration)
  let options = {
    method: 'POST',
    body: JSON.stringify({ x, y, duration })
  }
  let url = `/wda-api/session/${vm.session}/wda/touchAndHold`
  let { status, sessionId } = await fetch(url, options).then(res => res.json())
  if (status != 0) throw 'touch and hold failed'
  vm.session = sessionId
}

// 发送tap指令
export async function tap(vm, x, y) {
  return await tapAndHold(vm, x, y, 0.08)
}