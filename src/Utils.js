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
export function detectChessPiecePos(canvas, svg) {
  // find chess piece position
  // #37365f
  let ctx = canvas.getContext('2d')
  let { width, height, data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let chessSamples = []

  let yStart = (canvas.height * 0.4) >> 0
  let yEnd = (canvas.height * 0.8) >> 0
  for (let y = yStart; y < yEnd; ++y) {
    let base = 4 * y * width
    for (let x = 0; x < width; ++x) {
      let offset = base + 4 * x
      let r = data[offset]
        , g = data[offset + 1]
        , b = data[offset + 2]

      if (Math.abs(r - 0x37) < 3 && Math.abs(g - 0x36) < 3 && Math.abs(b - 0x5f) < 3) {
        chessSamples.push({x, y})
      }
    }

    if (chessSamples.length > 5) {
      // 取到足够多的样本，提前退出
      break
    }
  }

  let len = chessSamples.length
  if (len <= 0) return { x: 0, y: 0 }

  let totalBottom = chessSamples.reduce((prev, curr) => {
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

// 检测目标位置
export function detectTargetPos(canvas, svg, chessPos) {
  let ctx = canvas.getContext('2d')
  let { width, height, data } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let samples = []

  let yStart = (height * 0.25) >> 0
  let yEnd = (height * 0.6) >> 0
  for (let y = yStart; y < yEnd; ++y) {
    let base = 4 * y * width
    let lastR = data[base]
      , lastG = data[base + 1]
      , lastB = data[base + 2]
    let mask = []
    for (let x = 0; x < width; ++x) {
      let offset = base + 4 * x
      let r = data[offset]
        , g = data[offset + 1]
        , b = data[offset + 2]

      if (Math.abs(r - lastR) > 8 || Math.abs(g - lastG) > 8 || Math.abs(b - lastB) > 8) {
        mask.push(x)
      }
    }

    if (mask.length > 0) {
      let ox = (mask.reduce((prev, curr) => prev + curr) / mask.length) >> 0
      samples.push({ x: ox, y })

      if (samples.length > 4) {
        // 样本足够了
        break
      }
    }
  }

  let { ox, oy } = samples.reduce((prev, curr) => ({
    ox: prev.ox + curr.x,
    oy: prev.oy + curr.y
  }), {ox:0, oy:0})

  ox = ox / samples.length
  oy = oy / samples.length

  // 直线方程为 y = kx + c
  let k = (90 / 154) * (chessPos.x < width * 0.5 ? 1 : -1)
  let dx = ox - chessPos.x

  return {
    x: ox,
    y: chessPos.y - k * dx
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