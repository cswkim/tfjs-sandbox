<script>
  import '@tensorflow/tfjs-backend-webgl'
	import * as bodyPix from '@tensorflow-models/body-pix'
  import adapter from 'webrtc-adapter'
  import { onMount } from 'svelte'
  import {
    blurConfig,
    maskConfig,
    modelConfig,
    segmentationConfig
  } from './config'

  let browserInfo = {
    engine: adapter.browserDetails.browser,
    version: adapter.browserDetails.version
  }

  let cameraMode = 'environment'

  let canvasElem

  let errorMessage = ''

  let firstSnapDone = false

  let isProcessing = false

  let net

  let snapShotVisible = false

  let streamState = 'PENDING'
  $: streamReady = streamState === 'READY'
  $: streamError = streamState === 'ERROR'

  let video
  let videoElem

  let showVizList = false
  let visualizations = ['plainMask', 'blur', 'colorMask', 'pixelMask']
  let activeViz = visualizations[0]

  onMount(async () => {
    try {
      // Load BodyPix model
      net = await bodyPix.load(modelConfig)

      // Stream media to video element
      video = await loadVideo()

      // Set-up the canvas element to receive the snapshot
      canvasElem.width = video.width
      canvasElem.height = video.height

      streamState = 'READY'
    } catch (error) {
      triggerError(error)
    }
  })

  function isLandscape() {
    const orientation =
      (window.screen.orientation || {}).type || window.orientation

    let landscapeMode = false
    if (
        orientation === 'landscape-primary' ||
        orientation === 'landscape-secondary' ||
        orientation === 90 ||
        orientation === -90
    ) {
      landscapeMode = true
    }

    return landscapeMode
  }

  async function loadVideo() {
    stopVideoCapture()

    const isLandscapeMode = isLandscape()
    let cameraWidth = isLandscapeMode ? window.innerWidth : window.innerHeight
    let cameraHeight = isLandscapeMode ? window.innerHeight : window.innerWidth

    let constraints = {
      audio: false,
      video: {
        facingMode: cameraMode,
        width: { exact: cameraWidth },
        height: { exact: cameraHeight }
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    videoElem.srcObject = stream

    return new Promise((resolve) => {
      videoElem.onloadedmetadata = () => {
        videoElem.width = videoElem.videoWidth
        videoElem.height = videoElem.videoHeight
        resolve(videoElem)
      }
    })
  }

  async function runSegmentation(realTime = false) {
    try {
      const personPartSegmentation = await net.segmentPersonParts(
        video,
        segmentationConfig
      )

      if (activeViz === 'blur') {
        bodyPix.blurBodyPart(
          canvasElem,
          video,
          personPartSegmentation,
          blurConfig.faceBodyPartIdsToBlur,
          blurConfig.backgroundBlurAmount,
          blurConfig.edgeBlurAmount,
          blurConfig.flipHorizontal
        )
      } else if (activeViz === 'colorMask') {
        const maskImage = bodyPix.toColoredPartMask(personPartSegmentation)
        bodyPix.drawMask(
          canvasElem,
          video,
          maskImage,
          maskConfig.opacity,
          maskConfig.maskBlurAmount,
          maskConfig.flipHorizontal
        )
      } else if (activeViz === 'pixelMask') {
        const maskImage = bodyPix.toColoredPartMask(personPartSegmentation)
        bodyPix.drawPixelatedMask(
          canvasElem,
          video,
          maskImage,
          maskConfig.opacity,
          maskConfig.maskBlurAmount,
          maskConfig.flipHorizontal,
          maskConfig.pixelCellWidth
        )
      } else {
        const maskImage = bodyPix.toMask(personPartSegmentation)
        bodyPix.drawMask(
          canvasElem,
          video,
          maskImage,
          maskConfig.opacity,
          maskConfig.maskBlurAmount,
          maskConfig.flipHorizontal
        )
      }

      if (realTime) {
        requestAnimationFrame(runSegmentation)
      }
    } catch (error) {
      triggerError(error)
    }
  }

  function stopVideoCapture() {
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => {
        track.stop()
      })
      video.srcObject = null
    }
  }

	function takeSnapShot() {
    showProcessing()
    clearSnapShot()

    setTimeout(() => {
      runSegmentation(false)
      showSnapShot()
      hideProcessing()
      firstSnapDone = true
    }, 10)
	}

  function triggerError(error) {
    streamState = 'ERROR'
    errorMessage = error.message
  }

  function hideProcessing() {
    isProcessing = false
  }

  function showProcessing() {
    isProcessing = true
  }

  function clearSnapShot() {
    const ctx = canvasElem.getContext('2d')
    ctx.clearRect(0, 0, canvasElem.width, canvasElem.height)
  }

  function hideSnapShot() {
    snapShotVisible = false
  }

  function showSnapShot() {
    snapShotVisible = true
  }

  function selectViz(newViz) {
    activeViz = newViz
    showVizList = false
  }

  function toggleVizList() {
    showVizList = !showVizList
  }

  async function afterOrientationChange() {
    try {
      video = await loadVideo()
    } catch (error) {
      triggerError(error)
    }

    window.removeEventListener('resize', afterOrientationChange)
  }

  function onOrientationChange() {
    window.addEventListener('resize', afterOrientationChange)
  }

  async function toggleCamera() {
    try {
      cameraMode = cameraMode === 'user' ? 'environment' : 'user'
      video = await loadVideo()
    } catch (error) {
      triggerError(error)
    }
  }
</script>

<style lang="stylus">
  main
    display: flex
    align-items: center
    justify-content: center
    height: 100%
    color: #fff
    background-color: #000

    h1
      font-size: 24px

    video
      display: none

      &.active
        display: block

    button
      margin: 0
      padding: 0
      background: none
      border: none

  #snap-shot
    visibility: hidden
    position: absolute
    z-index: 2
    top: 0
    left: 0

    &.active
      visibility: visible

  #processing
    display: flex
    align-items: center
    justify-content: center
    position: absolute
    z-index: 4
    top: 0
    left: 0
    width: 100%
    height: 100%
    font-size: 40px
    background-color: #000

    > span
      animation: spin 2s linear infinite

  @keyframes spin
    100%
      transform: rotate(360deg)

  #flip
    position: absolute
    z-index: 3
    top: 10px
    right: 20px
    font-size: 40px

  #ui
    position: absolute
    z-index: 1
    display: flex
    width: 100%
    height: 100%

    footer
      display: flex
      align-self: flex-end
      width: 100%
      height: 100px
      padding: 0 20px
      background-color: rgba(0, 0, 0, 0.5)

      > div
        display: flex
        flex: 1
        align-items: center

      .selector
        position: relative
        text-indent: 5px

        > div
          display: flex
          justify-content: space-between
          width: calc(100% - 2px)
          height: 30px
          line-height: 30px
          color: #000
          white-space: nowrap
          background-color: #fff
          border: 1px solid #000

        ul
          position: absolute
          left: 0
          bottom: 66px
          width: calc(100% - 2px)
          color: #000
          background-color: #fff
          border: 1px solid #000
          border-bottom: 0

          li
            height: 30px
            line-height: 30px
            border-bottom: 1px solid #000

            &.active
              color: #999
              text-decoration: line-through

            &:last-child
              border-bottom: 0

      #snap-shot-trigger
        justify-content: center

        button
          width: 75px
          height: 75px
          border-radius: 50%
          border: 4px solid green
          background-color: #fff

      > button
        display: flex
        flex: 1
        justify-content: center
        align-items: center
        color: #fff
        font-size: 68px

  #not-supported
    ul
      margin-top: 40px

      li
        padding-bottom: 10px

        &:last-of-type
          padding-bottom: 0
</style>

<svelte:window on:orientationchange={onOrientationChange} />

<main>
  <video
    bind:this={videoElem}
    class:active={streamReady}
    playsinline
    autoplay
  >
  </video>

  {#if isProcessing}
    <div id="processing">
      <span>⏳</span>
    </div>
  {/if}
  {#if snapShotVisible}
    <button id="flip" on:click={hideSnapShot}>📷</button>
  {/if}
  <canvas id="snap-shot" bind:this={canvasElem} class:active={snapShotVisible}></canvas>

  {#if streamReady}
		<div id="ui">
      <footer>
        <div class="selector">
          <div on:click={toggleVizList}>
            {activeViz}
            {#if showVizList}
              <span>▼</span>
            {:else}
              <span>▲</span>
            {/if}
          </div>
          {#if showVizList}
            <ul>
              {#each visualizations as viz}
                <li
                  class:active={viz === activeViz}
                  on:click={() => selectViz(viz)}
                >
                  {viz}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
				<div id="snap-shot-trigger">
          <button on:click={takeSnapShot}>&nbsp;</button>
        </div>
        <button on:click={toggleCamera}>⟳</button>
			</footer>
    </div>
  {:else if streamError}
    <div id="not-supported">
      <h1>Oops!</h1>
      <ul>
        <li>Browser Engine: {browserInfo.engine}</li>
        <li>Browser Version: {browserInfo.version}</li>
        <li>{errorMessage}</li>
      </ul>
    </div>
  {:else}
    <h1>Initializing...</h1>
  {/if}
</main>
