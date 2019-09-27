import React, { Component } from 'react'
import mmBulletproof from 'assets/music/mm-bulletproof.mp3'
import audioWorkerJS from './audio.worker.js'

import {
  DonutLarge,
  VolumeMute,
  VolumeDown,
  VolumeUp
} from '@material-ui/icons'

class Audio extends Component {
  constructor(props) {
    super(props)

    /**
     * worker
     */
    this.audioWorker = audioWorkerJS()
    this.audioWorker.onmessage = (data) => this.handleWorkerCallback(data)

    /**
     * state
     */
    this.state = {
      /**
       * Audio Context
       */
      audioContext: null,
      analyser: null,
      gainNode: null,
      currentSource: null,
      bufferLength: null,
      duration: 0,
      tracks: [
        {
          name: 'Bulletproof',
          artist: 'Mike Mol',
          url: mmBulletproof
        }
      ],
      musicIndex: 0,
      playing: false,
      javascriptNode: null,
      firstPlay: true,
      audioContextCreatedTime: 0,
      audioLoadOffsetTime: 0,
      audioCurrentTime: 0,
      updatedVolume: false,
      isLoadingSong: false,
      isLoadingFullSong: false,
      canLoadFullSong: true,
      playingFullMusic: false,
      audioStreamData: null,
      trackerEnabled: false, // @NOTE: tracker disabled until solve the thing of re-read stream data and not re-set the position of tracker

      /**
       * Canvas Context
       */
      canvas: null,
      canvasContext: null,
      canvasWidth: null,
      canvasHeight: null,
      canvasScaleCoef: null,
      canvasCx: null,
      canvasCy: null,
      canvasCoord: null,
      canvasFirstDraw: true,
      canvasResized: false,

      /**
       * Framer Context
       */
      framerTransformScale: false,
      framerCountTicks: 360,
      framerFrequencyData: [],
      framerTickSize: 10,
      framerPI: 360,
      framerIndex: 0,
      framerLoadingAngle: 0,
      framerMaxTickSize: null,
      framerTicks: null,

      /**
       * Scene Context
       */
      scenePadding: 120,
      sceneMinSize: 740,
      sceneOptimiseHeight: 982,
      sceneInProcess: false,
      sceneRadius: 250,

      /**
       * Tracker Context
       */
      trackerInnerDelta: 20,
      trackerLineWidth: 7,
      trackerPrevAngle: 0.5,
      trackerAngle: 0,
      trackerAnimationCount: 10,
      trackerPressButton: false,
      trackerAnimatedInProgress: false,
      trackerAnimateId: null,
      trackerR: 226.5,

      /**
       * Controls Context
       */
      timeControl: {
        textContent: '00:00'
      },

      /**
       * Misc
       */
      initialFixedTicks: false,
      hasStreamSupport: !!window.fetch && !!window.ReadableStream
    }

    /**
     * functions
     */
    // @Player
    this.init = this.init.bind(this)
    this.loadSong = this.loadSong.bind(this)
    this.playSound = this.playSound.bind(this)
    this.startPlayer = this.startPlayer.bind(this)
    this.prevSong = this.prevSong.bind(this)
    this.nextSong = this.nextSong.bind(this)
    this.switchSong = this.switchSong.bind(this)
    this.showPlayer = this.showPlayer.bind(this)
    this.audioXMLHttpRequest = this.audioXMLHttpRequest.bind(this)
    this.audioStream = this.audioStream.bind(this)
    this.readAudioStream = this.readAudioStream.bind(this)
    // @Framer
    this.framerInit = this.framerInit.bind(this)
    this.framerDraw = this.framerDraw.bind(this)
    this.framerSetLoadingPercent = this.framerSetLoadingPercent.bind(this)
    this.framerGetSize = this.framerGetSize.bind(this)
    // @Scene
    this.sceneInit = this.sceneInit.bind(this)
    this.startSceneRender = this.startSceneRender.bind(this)
    this.sceneRender = this.sceneRender.bind(this)
    this.sceneClear = this.sceneClear.bind(this)
    this.sceneDraw = this.sceneDraw.bind(this)
    // @Tracker
    this.trackerInit = this.trackerInit.bind(this)
    this.trackerStartAnimation = this.trackerStartAnimation.bind(this)
    this.trackerStopAnimation = this.trackerStopAnimation.bind(this)
    this.trackerIsInsideOfSmallCircle = this.trackerIsInsideOfSmallCircle.bind(this)
    this.trackerIsOusideOfBigCircle = this.trackerIsOusideOfBigCircle.bind(this)
    // @Miscs
    this.timeHandler = this.timeHandler.bind(this)
    this.preLoadCompleteSong = this.preLoadCompleteSong.bind(this)
    this.initEvents = this.initEvents.bind(this)
    this.getSongName = this.getSongName.bind(this)
    this.getSongArtist = this.getSongArtist.bind(this)
    this.songContextHandler = this.songContextHandler.bind(this)
    this.handleWorkerCallback = this.handleWorkerCallback.bind(this)
  }

  componentDidMount() {
    new Promise(resolve => this.canvasConfigure(resolve))
    .then(() => this.showPlayer())
  }

  componentWillUnmount() {
    this.audioWorker.terminate()
  }

  showPlayer() {
    this.framerSetLoadingPercent(1)
    this.sceneInit()
  }

  startPlayer() {
    this.init()
  }

  initEvents() {
  }

  handleWorkerCallback(data) {
    console.log('call back data: ', data)
  }

  init() {
    try {
      const { tracks, musicIndex } = this.state

      // Fix up for prefixing
      window.AudioContext = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContext()
      const audioContextCreatedTime = new Date()
      const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1)

      const analyser = audioContext.createAnalyser()
      const gainNode = audioContext.createGain()

      analyser.fftSize = 1024
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      javascriptNode.onaudioprocess = () => {
        analyser.getByteFrequencyData(this.state.framerFrequencyData) // For Bits
        // analyser.getByteTimeDomainData(this.state.framerFrequencyData) // For Waves
      }

      this.initEvents()

      this.setState({
        audioContext,
        analyser,
        gainNode,
        dataArray,
        bufferLength,
        framerFrequencyData: dataArray,
        javascriptNode,
        audioContextCreatedTime
      }, () => {
          this.loadSong(tracks[musicIndex].url)
      })
    } catch (error) {
      console.error(error)
      console.error('Web Audio API is not supported in this browser')
    }
  }

  loadSong(url) {
    const { hasStreamSupport } = this.state

    this.audioWorker.postMessage({ type: 'audio', data: 'lorem ipsum' })

    if (hasStreamSupport) {
      console.log('fetch and stream')
      this.audioStream(url)
    } else {
      this.audioXMLHttpRequest(url)
    }
  }

  audioXMLHttpRequest(url) {
    const { audioContext } = this.state
    let {
      audioContextCreatedTime,
      audioLoadOffsetTime
    } = this.state

    const request = new XMLHttpRequest()
    request.open('GET', url, true)
    request.responseType = 'arraybuffer'

    // Decode asynchronously
    request.onload = () => {
      audioContext.decodeAudioData(request.response, (buffer) => {
        const completeBuffer = buffer
        const currentSource = audioContext.createBufferSource()

        currentSource.buffer = completeBuffer
        this.setState({ currentSource }, () => {
          this.playSound()
          audioLoadOffsetTime = (new Date() - audioContextCreatedTime) / 1000

          if (audioLoadOffsetTime > audioContext.currentTime) {
            audioLoadOffsetTime = audioContext.currentTime
          }

          this.setState({
            audioContextCreatedTime,
            audioLoadOffsetTime,
            playingFullMusic: true,
            isLoadingSong: false
          })
        })
      }, function (error) {
        console.error(error)
      })
    }
    request.send()
  }

  audioStream(url) {
    const { audioContext } = this.state
    let {
      audioContextCreatedTime,
      audioLoadOffsetTime
    } = this.state

    fetch(url).then(response => {
      if (!response.ok) {
        throw Error(`${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw Error('ReadableStream not yet supported in this browser.')
      }

      const contentLength = response.headers.get('content-length')
      if (!contentLength) {
        throw Error('Content-Length response header unavailable')
      }

      this.setState({ audioStreamData: { response: response.clone(), contentLength: response.headers.get('content-length')} })

      const stream = this.readAudioStream(response, contentLength, { all: false, sec: 3, amount: 1245184 })
      return new Response(stream)
    }).then(response => {
      return response.arrayBuffer()
    }).then(responseBuffer => {
      console.log('start decode audio')
      audioContext.decodeAudioData(responseBuffer, (buffer) => {
        if (this.state.currentSource !== null) {
          this.state.currentSource.disconnect()
        }

        const currentSource = audioContext.createBufferSource()

        currentSource.buffer = buffer
        this.setState({ currentSource }, () => {
          console.log('audio decoded and starting music')
          this.playSound()
          audioLoadOffsetTime = (new Date() - audioContextCreatedTime) / 1000

          if (audioLoadOffsetTime > audioContext.currentTime) {
            audioLoadOffsetTime = audioContext.currentTime
          }

          this.setState({
            audioContextCreatedTime,
            audioLoadOffsetTime,
            isLoadingSong: false,
            canLoadFullSong: true
          })
        })
      }, function (error) {
        console.error(error)
      })
    })
  }

  readAudioStream(response, contentLength, params) {
    const total = parseInt(contentLength, 10)
    let loaded = 0
    const startedStream = new Date()
    const that = this

    const stream = new ReadableStream({
      start(controller) {
        const reader = response.body.getReader()
        const read = () => {
          reader.read().then(({ done, value }) => {

            if (!params.all) {
              if (params.amount) {
                if (params.amount < total && loaded >= params.amount) {
                  console.log(`Close stream frag - amount`)
                  reader.releaseLock()
                  controller.close()
                  return
                } else if (loaded >= (65536 * 5)) { // 327.680
                  console.log(`Close stream frag - amount`)
                  reader.releaseLock()
                  controller.close()
                  return
                }
              } else {
                  if (((new Date() - startedStream) / 1000) >= (params.sec || 5)) {
                    console.log(`Close stream frag - time`)
                    reader.releaseLock()
                    controller.close()
                    return
                  }
              }
            }
            if (done) {
              console.log(`Close stream done`)
              that.setState({ playingFullMusic: true })
              reader.releaseLock()
              controller.close()
              return
            }

            loaded += value.byteLength
            console.log({ loaded, total, percent: `${((loaded * 100) / total).toFixed(2)}%` }, (new Date() - startedStream) / 1000)
            controller.enqueue(value)

            read()
          }).catch(error => {
            console.error(error)
            controller.error(error)
          })
        }

        read()
      }
    })

    return stream
  }

  playSound(when = null, offset = null) {
    const {
      audioContext,
      analyser,
      gainNode,
      javascriptNode,
      currentSource,
      updatedVolume
    } = this.state

    const source = currentSource
    source.connect(analyser)
    analyser.connect(gainNode)
    gainNode.connect(audioContext.destination)
    javascriptNode.connect(audioContext.destination)

    // Set the start volume to 50%.
    if (gainNode && !updatedVolume) {
      gainNode.gain.value = 0.5
    }

    if (when && offset) {
      source.start(when, offset)
    } else {
      source.start(0)
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    this.setState({ playing: true })
  }

  preLoadCompleteSong() {
    const {
      audioContext,
      analyser,
      gainNode,
      javascriptNode,
      canLoadFullSong
    } = this.state

    let {
      audioStreamData,
      audioLoadOffsetTime,
      audioContextCreatedTime
    } = this.state

    new Promise((resolve) => {
      this.setState({ audioStreamData: { response: audioStreamData.response.clone(), contentLength: audioStreamData.response.headers.get('content-length') } })

      const stream = this.readAudioStream(audioStreamData.response, audioStreamData.contentLength, { all: true, sec: 1, amount: 1050478 })
      resolve(new Response(stream))
    }).then(response => {
      return response.arrayBuffer()
    }).then(responseBuffer => {
      audioContext.decodeAudioData(responseBuffer, (buffer) => {
        if (canLoadFullSong) {
          this.state.currentSource.disconnect()

          const currentSource = audioContext.createBufferSource()
          currentSource.buffer = buffer

          const offset = (audioContext.currentTime - audioLoadOffsetTime)

          const source = currentSource
          source.connect(analyser)
          analyser.connect(gainNode)
          gainNode.connect(audioContext.destination)
          javascriptNode.connect(audioContext.destination)

          source.start(offset, offset)

          if (audioContext.state === 'suspended') {
            audioContext.resume()
          }

          this.setState({ playing: true, isLoadingFullSong: false })

          this.setState({ currentSource }, () => {
            console.log('audio decoded and starting music from stream - full song loaded')
            const offset = (audioContext.currentTime - audioLoadOffsetTime)
            console.log({
              offset,
              duration: currentSource.buffer.duration
            })

            this.setState({ audioContextCreatedTime})
          })
        }
      }, function (error) {
        console.error(error)
      })
    })
  }

  nextSong() {
    const {
      firstPlay,
      audioContext
    } = this.state
    let { musicIndex, tracks } = this.state

    if (musicIndex >= (tracks.length - 1)) {
      musicIndex = 0
    } else {
      musicIndex += 1
    }

    console.log({musicIndex})

    if (firstPlay) {
      this.setState({ isLoadingSong: true })
      this.setState({ firstPlay: false, musicIndex }, () => {
        this.init()
      })
    } else {
      audioContext.suspend()
      this.switchSong(musicIndex)
    }
  }

  prevSong() {
    const { firstPlay, audioContext } = this.state
    let { musicIndex, tracks } = this.state

    if (musicIndex <= 0) {
      musicIndex = tracks.length - 1
    } else {
      musicIndex -= 1
    }

    if (firstPlay) {
      this.setState({ isLoadingSong: true })
      this.setState({ firstPlay: false, musicIndex }, () => {
        this.init()
      })
    } else {
      audioContext.suspend()
      this.switchSong(musicIndex)
    }
  }

  switchSong(musicIndex) {
    let {
      tracks,
      currentSource,
    } = this.state

    const { isLoadingSong } = this.state

    this.timeHandler()

    if (!isLoadingSong) {
      this.setState({ isLoadingSong: true })
    }

    if (currentSource) {
      currentSource.disconnect()
      this.setState({ playing: false, musicIndex, playingFullMusic: false, canLoadFullSong: false })
    }

    this.loadSong(tracks[musicIndex].url)
  }

  canvasConfigure(resolve) {
    let { canvas, canvasContext } = this.state
    if (canvas == null)
      canvas = document.querySelector('#Player-canvas')
    canvasContext = canvas.getContext('2d')

    this.setState({
      canvas,
      canvasContext
    }, () => {
      this.calculateSize(resolve)
    })
  }

  calculateSize(resolve) {
    let { canvas } = this.state
    const padding = 120
    const minSize = 740
    const optimiseHeight = 982

    const canvasScaleCoef = Math.max(0.5, 740 / optimiseHeight)

    const size = Math.max(minSize, document.body.clientHeight)
    canvas.setAttribute('width', size)
    canvas.setAttribute('height', size)

    const canvasWidth = size
    const canvasHeight = size

    const sceneRadius = (size - padding * 2) / 2
    const canvasCx = sceneRadius + padding
    const canvasCy = sceneRadius + padding
    const canvasCoord = canvas.getBoundingClientRect()

    this.setState({
      canvas,
      canvasWidth,
      canvasHeight,
      canvasScaleCoef,
      canvasCx,
      canvasCy,
      canvasCoord,
      sceneRadius
    }, () => typeof resolve  === 'function' && resolve())
  }

  framerInit() {
    let {
      canvasScaleCoef,
      framerTickSize,
      framerCountTicks
    } = this.state

    const framerMaxTickSize = framerTickSize * 9 * canvasScaleCoef
    framerCountTicks = 360 * canvasScaleCoef

    this.setState({ framerCountTicks, framerMaxTickSize})
  }

  sceneInit() {
    this.sceneInitHandlers()

    this.framerInit()
    this.trackerInit()
    this.timeHandler()

    this.startSceneRender()

    setInterval(() => {
      this.timeHandler()
      this.songContextHandler()
    }, 300)
  }

  sceneInitHandlers() {
    window.onresize = () => {
      this.canvasConfigure()
      this.framerInit()
      this.sceneRender()

      this.setState({ canvasResized: true })
    }
  }

  startSceneRender() {
    this.setState({ sceneInProcess: true })
    this.sceneRender()
  }

  sceneRender() {
    if (this.state.canvasFirstDraw || this.state.canvasResized) {
      this.sceneClear()
      this.sceneDraw()
      this.setState({ canvasFirstDraw: false, canvasResized: false })
    }

    requestAnimationFrame(() => {
      if (this.state.playing) {
        this.sceneClear()
        this.sceneDraw()
      }
      if (this.state.sceneInProcess) {
        this.sceneRender()
      }
    })
  }

  sceneClear() {
    const {
      canvasWidth,
      canvasHeight,
      canvasContext
    } = this.state

    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  sceneDraw() {
    this.framerDraw()
    this.trackerDraw()
  }

  framerDraw() {
    this.frameLooper()
  }

  frameLooper() {
    var i,
      cx, cy,
      r = 50,
      beginAngle = 0,
      angle,
      twoPI = 2 * Math.PI,
      angleGap = twoPI / 3,
      color = 'rgba(115, 226, 36, 0.5)';

    var fbc_array,data,total,len;
    const {canvas, canvasContext, analyser} = this.state;
    if (analyser === null || canvas === null || canvasContext == null) return;
    len = 1024 / 16;

    //window.requestAnimationFrame(this.frameLooper);
    fbc_array = new Uint8Array(analyser.frequencyBinCount);

    canvasContext.save();
    analyser.getByteFrequencyData(fbc_array);
    data = fbc_array;
    angle = beginAngle;
    cx = canvas.width / 2;
    cy = canvas.height / 2;
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.strokeStyle = color;
    canvasContext.globalCompositeOperation = 'lighter';
    canvasContext.lineWidth = 10;
    total = 0;
    for (i = 8; i < len; i += 2) {
        angle += 0.2;
        canvasContext.beginPath();
        canvasContext.moveTo(cx + data[i] * Math.sin(angle), cy + data[i] * Math.cos(angle));
        canvasContext.lineTo(cx + data[i] * Math.sin(angle + angleGap), cy + data[i] * Math.cos(angle + angleGap));
        canvasContext.lineTo(cx + data[i] * Math.sin(angle + angleGap * 2), cy + data[i] * Math.cos(angle + angleGap * 2));
        canvasContext.closePath();
        canvasContext.stroke();
        total += data[i];
    }
    beginAngle = (beginAngle + 0.00001 * total) % twoPI;
    canvasContext.restore();
  }


  framerGetSize(angle, l, r) {
    const {
      framerMaxTickSize,
      framerTickSize,
      framerIndex,
      framerCountTicks
    } = this.state
    const m = (r - l) / 2
    const x = (angle - l)
    let size

    if (x === m) {
      return framerMaxTickSize
    }
    const diameter = Math.abs(m - x)
    const v = 70 * Math.sqrt(1 / diameter)
    if (v > framerMaxTickSize) {
      size = framerMaxTickSize - diameter
    } else {
      size = Math.max(framerTickSize, v)
    }

    if (framerIndex > framerCountTicks) {
      this.setState({ framerIndex: 0 })
    }

    return size
  }

  framerDrawEdging() {
    const {
      trackerLineWidth,
      trackerInnerDelta,
      canvasCx,
      canvasCy,
      sceneRadius,
      canvasContext,
      scenePadding,
      framerLoadingAngle
    } = this.state

    canvasContext.save()
    canvasContext.beginPath()
    canvasContext.strokeStyle = 'rgba(97, 218, 251, 0.5)'
    canvasContext.lineWidth = 1

    const offset = trackerLineWidth / 2
    canvasContext.moveTo(scenePadding + 2 * sceneRadius - trackerInnerDelta - offset, scenePadding + sceneRadius)
    canvasContext.arc(canvasCx, canvasCy, sceneRadius - trackerInnerDelta - offset, 0, framerLoadingAngle, false)

    canvasContext.stroke()
    canvasContext.restore()
  }

  framerSetLoadingPercent(percent) {
    this.setState({ framerLoadingAngle: percent * 2 * Math.PI })
  }

  trackerInit() {
    // let {
    //   canvas,
    //   trackerAngle,
    //   trackerPressButton,
    //   trackerAnimatedInProgress,
    //   audioContext,
    //   currentSource,
    //   sceneInProcess
    // } = this.state

    // canvas.addEventListener('mousedown', event => {
    //   if (this.trackerIsInsideOfSmallCircle(event) || this.trackerIsOusideOfBigCircle(event)) {
    //     return
    //   }
    //   this.setState({ trackerPressButton: true, trackerPrevAngle: trackerAngle})
    //   this.trackerStopAnimation()
    //   this.setState({ trackerAnimatedInProgress: true})
    //   this.trackerCalculateAngle(event)
    // })

    // window.addEventListener('mouseup', () => {
    //   if (!trackerPressButton) {
    //     return
    //   }
    //   const id = setInterval(() => {
    //     if (!trackerAnimatedInProgress) {
    //       this.setState({ trackerPressButton: false })
    //       audioContext.currentTime = trackerAngle / (2 * Math.PI) * currentSource.buffer.duration

    //       clearInterval(id)
    //     }
    //   }, 100)
    // })

    // window.addEventListener('mousemove', event =>  {
    //   if (trackerAnimatedInProgress) {
    //     return
    //   }
    //   if (trackerPressButton && sceneInProcess) {
    //     this.trackerCalculateAngle(event)
    //   }
    // })
  }

  trackerDraw() {
    const {
      currentSource,
      audioContext,
      trackerPressButton,
      audioLoadOffsetTime,
      isLoadingSong
    } = this.state

    if (currentSource !== null && this.state.trackerEnabled) {
      if (!currentSource.buffer) {
        return
      }

      if (!trackerPressButton) {
        const angle = (audioContext.currentTime - audioLoadOffsetTime) / currentSource.buffer.duration * 2 * Math.PI || 0
        this.setState({ trackerAngle: angle })
      }

      if (!isLoadingSong) {
        this.trackerDrawArc()
      }
    }
  }

  trackerDrawArc() {
    let {
      canvasContext,
      sceneRadius,
      trackerInnerDelta,
      scenePadding,
      trackerLineWidth,
      trackerAngle
    } = this.state

    canvasContext.save()
    canvasContext.strokeStyle = 'rgba(97, 218, 251, 0.8)'
    canvasContext.beginPath()
    canvasContext.lineWidth = trackerLineWidth

    const trackerR = sceneRadius - (trackerInnerDelta + trackerLineWidth / 2)
    canvasContext.arc(
      sceneRadius + scenePadding,
      sceneRadius + scenePadding,
      trackerR, 0, trackerAngle, false
    )
    canvasContext.stroke()
    canvasContext.restore()
  }

  trackerStartAnimation() {
    const {
      trackerAnimationCount,
      trackerPrevAngle,
      trackerAngle
    } = this.state

    let angle = trackerAngle
    const l = Math.abs(trackerAngle) - Math.abs(trackerPrevAngle)
    let step = l / trackerAnimationCount, i = 0

    const calc = () => {
      angle += step
      if (++i === trackerAnimationCount) {
        this.setState({
          trackerAngle: angle,
          trackerPrevAngle: angle,
          trackerAnimatedInProgress: false
        })
      } else {
        this.setState({ trackerAnimateId: setTimeout(calc, 20) })
      }
    }
  }

  trackerStopAnimation() {
    clearTimeout(this.state.trackerAnimateId)
    this.setState({trackerAnimatedInProgress: false})
  }

  trackerCalculateAngle(event) {
    const {
      canvasCx,
      canvasCy,
      canvasCoord,
      canvasContext,
      animatedInProgress,
      trackerAngle,
      isLoadingSong
    } = this.state

    const mx = event.pageX
    const my = event.pageY
    let angle = Math.atan((my - canvasCy - canvasCoord.top) / (mx - canvasCx - canvasCoord.left))

    if (mx < canvasContext + canvasCoord.left) {
      angle = Math.PI + angle
    }
    if (angle < 0) {
      angle += 2 * Math.PI
    }

    this.setState({ trackerAngle: angle })

    if (animatedInProgress && !isLoadingSong) {
      this.trackerStartAnimation()
    } else {
      this.setState({ trackerPrevAngle: trackerAngle})
    }
  }

  trackerIsInsideOfSmallCircle(event) {
    let {
      canvasCx,
      canvasCy,
      canvasCoord,
      sceneRadius,
      trackerInnerDelta
    } = this.state

    const x = Math.abs(event.pageX - canvasCx - canvasCoord.left)
    const y = Math.abs(event.pageY - canvasCy - canvasCoord.top)

    return Math.sqrt(x * x + y * y) < sceneRadius - 3 * trackerInnerDelta
  }

  trackerIsOusideOfBigCircle (event) {
    let {
      canvasCx,
      canvasCy,
      canvasCoord,
      sceneRadius
    } = this.state
    return Math.abs(event.pageX - canvasCx - canvasCoord.left) > sceneRadius ||
      Math.abs(event.pageY - canvasCy - canvasCoord.top) > sceneRadius
  }

  timeHandler() {
    const {
      audioContext,
      audioLoadOffsetTime,
      currentSource
    } = this.state

    let {
      timeControl
    } = this.state

    let rawTime = 0

    if (audioContext && audioContext.state !== 'suspended' && currentSource) {
      // When start time of the track from the middle for example, need add a startTime (offset) into calc
      // let audioCurrentTime = audioContext.currentTime - audioLoadOffsetTime - startTime
      let audioCurrentTime = audioContext.currentTime - audioLoadOffsetTime

      rawTime = parseInt(audioCurrentTime || 0)

      const secondsInMin = 60
      let min = parseInt(rawTime / secondsInMin)
      let seconds = rawTime - min * secondsInMin
      if (min < 10) {
        min = `0${min}`
      }
      if (seconds < 10) {
        seconds = `0${seconds}`
      }
      const time = `${min}:${seconds}`
      timeControl.textContent = time
    }
  }

  songContextHandler() {
    const {
      audioContext,
      currentSource,
      audioLoadOffsetTime,
      playingFullMusic,
      hasStreamSupport,
      isLoadingFullSong,
      canLoadFullSong
    } = this.state

    if (audioContext && audioContext.state !== 'suspended' && currentSource) {
      let audioCurrentTime = audioContext.currentTime - audioLoadOffsetTime
      const currentDuration = currentSource.buffer.duration

      if (audioCurrentTime >= (currentDuration - 3.5) && !playingFullMusic && hasStreamSupport && !isLoadingFullSong && canLoadFullSong) {
        this.setState({ isLoadingFullSong: true })
        this.preLoadCompleteSong()
      } else {
        // console.log(audioCurrentTime, currentDuration, audioCurrentTime >= currentDuration)
        if (playingFullMusic && audioCurrentTime >= (currentDuration - 1.5) && !isLoadingFullSong ) {
          this.nextSong()
        }
      }
    }
  }

  getSongName() {
    const { tracks, musicIndex } = this.state
    if (tracks[musicIndex]) {
      return tracks[musicIndex].name || 'No Music Name Found'
    }
  }
  getSongArtist() {
    const { tracks, musicIndex } = this.state
    if (tracks[musicIndex]) {
      return tracks[musicIndex].artist || 'No Music Artist Found'
    }
  }

  /**
   * React Render
   */
  render() {
    return (
      <div className='Audio'>
          <div className='Player'>
            <canvas id='Player-canvas' key='Player-canvas'></canvas>
            <div className='song-info'>
              <div className='song-artist'>{this.getSongArtist()}</div>
              <div className='song-name'>{this.getSongName()}</div>
            </div>
            <div className='controls'>
              <div className='prev-song'>
                <DonutLarge style={{ fontSize: '72px', color: 'rgba(97, 218, 251, 0.8)', margin: '1rem', cursor: 'pointer' }} onClick={this.prevSong} />
              </div>
              <div className='next-song'>
                <DonutLarge style={{ fontSize: '72px', color: 'rgba(97, 218, 251, 0.8)', margin: '1rem', cursor: 'pointer' }} onClick={this.nextSong} />
              </div>
            </div>
          </div>
      </div>
    )
  }
}

export default Audio
