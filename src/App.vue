<template>
  <div>
    <div>Base on WebDriverAgent</div>
    <div>
      <span class="mouse-state" v-for="(state, i) in allMouseStates" :key="i">
        <input type="radio" v-model="mouseState" :value="state" :id="`mst-${i}`"/>
        <label :for="`mst-${i}`">{{state}}</label>
      </span>
      <span class="mouse-state">
        <button @click="autoRun" v-if="autoRunning === false">auto run</button>
        <button @click="stopAutoRun" v-if="autoRunning">stop run</button>
      </span>
    </div>
    <div class="canvas-container">
      <canvas
        class="view-layer"
        ref="c"
        :width="swidth"
        :height="sheight"
      ></canvas>
      <svg
        class="action-layer"
        ref="actionlayer"
        :width="swidth * screenToViewCoefficient || 0"
        :height="sheight * screenToViewCoefficient || 0"
        @click="handleTapTarget($event)"
      ></svg>
    </div>
    <pre>
      session: {{session}}
      coefficient[view -> screen]: {{viewToScreenCoefficient.toFixed(2)}}
      coefficient[view -> device]: {{viewToDeviceCoefficient.toFixed(2)}}
      ---
        view size(px): ({{view.width}}, {{view.height}})
      screen size(px): ({{screen.width}}, {{screen.height}})
      device size(px): ({{device.width}}, {{device.height}})
      ---
        view click pos: ({{click.x}}, {{click.y}})
      device click pos: ({{cord.x}}, {{cord.y}})
      ---
      chess pos: ({{chess.x}}, {{chess.y}})
      distance: {{this.jumpDistance}}px
      duration: {{this.duration}}s
      ---
    </pre>
  </div>
</template>

<script>
import * as utils from './Utils.js'
import * as d3 from 'd3'

function data() {
  return {
    loopIsRunning: true,
    index: 0,
    session: '',
    device: { width: -1, height: -1 },  // 设备逻辑尺寸
    view: { width: -1, height: -1 },    // 绘制视图尺寸
    screen: { width: -1, height: -1 },  // 屏幕实际物理像素
    click: { x: -1, y: -1 },
    cord: { x: -1, y: -1 },
    chess: { x: -1, y: -1 },            // 辅助跳一跳时，棋子所在位置
    jumpDistance: 0,
    duration: 0,
    allMouseStates: ['click-mode', 'tap-tap-helper'],
    mouseState: 'click-mode',
    autoRunning: false
  }
}

export default {
  name: 'app',
  data,
  computed: {
    screenCtx() { return this.$refs.c.getContext('2d') },
    swidth() { return this.screen.width <= 0 ? 750 : this.screen.width },
    sheight() { return this.screen.height <= 0 ? 1334 : this.screen.height },
    viewToScreenCoefficient() { return this.screen.width / this.view.width },
    viewToDeviceCoefficient() { return this.device.width / this.view.width },
    screenToViewCoefficient() { return this.view.width / this.screen.width }
  },
  mounted: async function () {
    console.log('app screenshot loop start to run')
    while (this.loopIsRunning) {
      await utils.sleep(20)
      try {
        let { width, height } = await utils.drawScreenshot(this)
        this.screen.width = width
        this.screen.height = height
        // 获取视图的尺寸
        if (this.view.width <= 0 || this.view.height <= 0) {
          let style = getComputedStyle(this.$refs.c)
          this.view.width = parseFloat(style.width) || -1
          this.view.height = parseFloat(style.height) || -1
        }
        // 获取设备的实际尺寸（非物理像素）
        if (this.device.width <= 0 || this.device.height <= 0) {
          let { value, status } = await fetch(`/wda-api/session/${this.session}/window/size`).then(res => res.json())
          if (status != 0) {
            console.log('get window size failed')
          } else {
            this.device = value
          }
        }
      } catch (ex) {
        console.warn(`draw screenshot failed, ${ex}`)
      }
    }
    console.log('exit loop')
  },
  destroyed() {
    this.loopIsRunning = false
  },
  methods: {
    highlightPos({x, y}) {
      let svg = this.$refs.actionlayer
      let pointer = d3.select(svg).selectAll('circle.pointer').data([{x, y}])
      pointer.exit().remove()
      pointer.enter().append('circle')
        .attr('class', 'pointer')
        .attr('fill', 'yellow')
        .attr('stroke', 'gray')
        .merge(pointer)
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
          .attr('r', 10)
          .transition()
          .delay(100)
          .duration(100)
          .attr('r', 0)
    },
    handleTapTarget(ev) {
      let { offsetX, offsetY } = ev
      this.click.x = offsetX
      this.click.y = offsetY

      this.cord.x = offsetX * this.viewToDeviceCoefficient
      this.cord.y = offsetY * this.viewToDeviceCoefficient

      let info = {
        viewX: offsetX,
        viewY: offsetY,
        deviceX: this.cord.x,
        deviceY: this.cord.y,
        screenX: offsetX * this.viewToScreenCoefficient,
        screenY: offsetY * this.viewToScreenCoefficient
      }

      if (this.mouseState === 'tap-tap-helper') {
        return this.handleTapTapHelper(ev, info)
      } else {
        return this.handleClick(ev, info)
      }
    },
    // view.x, view.y, screen.x, screen.y
    handleTapTapHelper(ev, { viewX, viewY, screenX, screenY, deviceX, deviceY }) {
      let { x, y } = utils.detectChessPiecePos(this.$refs.c)
      this.chess.x = x
      this.chess.y = y

      let target = utils.detectTargetPos(this.$refs.c, null, this.chess)
      console.log(target)
      this.highlightPos({
        x: target.x * this.screenToViewCoefficient,
        y: target.y * this.screenToViewCoefficient
      })

      let dx = target.x - x
      let dy = target.y - y
      let dist = Math.sqrt(dx*dx + dy*dy)
      this.jumpDistance = dist

      // iPhone 7 的参数
      let alpha = 0.8 / 415.52
      this.duration = alpha * dist

      utils.tapAndHold(this, 269, 640, this.duration)
    },
    handleClick(ev, { viewX, viewY, screenX, screenY, deviceX, deviceY }) {
      this.highlightPos(this.click)
      utils.tap(this, deviceX, deviceY)
    },

    stopAutoRun() {
      this.autoRunning = false
    },

    async autoRun() {
      this.autoRunning = true
      do {
        let chess = utils.detectChessPiecePos(this.$refs.c)
        if (chess.x <= 2 || chess.y <= 2) {
          console.log('chess pos invalid, stop auto run')
          break
        }
        let target = utils.detectTargetPos(this.$refs.c, null, chess)
        let dx = target.x - chess.x
        let dy = target.y - chess.y
        let dist = Math.sqrt(dx*dx + dy*dy)
        // iPhone 7 的参数
        let alpha = 0.8 / 415.52
        this.duration = alpha * dist
        utils.tapAndHold(this, 269, 640, this.duration)
        this.highlightPos({
          x: target.x * this.screenToViewCoefficient,
          y: target.y * this.screenToViewCoefficient
        })
        await utils.sleep(4500)
      } while (this.autoRunning)
      console.log('auto running stoped')
    }
  }
}
</script>

<style lang="less" scoped>
.mouse-state {
  font-size: 12px;
  display: inline-block;
  margin-right: 1em;
  padding: 7px 0;
  
  label {
    vertical-align: top;
  }
}

.canvas-container {
  position: relative;
  canvas {
    height: 600px;
    border: 1px solid gray;
  }

  svg.action-layer {
    position: absolute;
    left: 1px;
    top: 1px;
  }
}
</style>

