<script>
  // import '@tensorflow/tfjs-backend-webgl'
	import * as tf from '@tensorflow/tfjs-node'
  import adapter from 'webrtc-adapter'
  import { onMount } from 'svelte'

  let browserInfo = {
    engine: adapter.browserDetails.browser,
    version: adapter.browserDetails.version
  }

  let canvasElem

  let constraints = {
    audio: false,
    video: { facingMode: 'environment' }
  }

  let errorMessage = ''

  let isProcessing = false

  let net

  let snapShotVisible = false

  let streamState = 'PENDING'
  $: streamReady = streamState === 'READY'
  $: streamError = streamState === 'ERROR'

  let video
  let videoElem

  onMount(async () => {
    try {
      // Load object detection model
      net = await tf.loadGraphModel('file://ssd-mobilenet-v2/model.json')

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

  async function loadVideo() {
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

  async function runDetection() {
    try {
      console.log('boo')
    } catch (error) {
      triggerError(error)
    }
  }

	function takeSnapShot() {
    showProcessing()
    clearSnapShot()

    setTimeout(() => {
      runDetection()
      showSnapShot()
      hideProcessing()
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

      #snap-shot-trigger
        justify-content: center

        button
          width: 75px
          height: 75px
          border-radius: 50%
          border: 4px solid green
          background-color: #fff

  #not-supported
    ul
      margin-top: 40px

      li
        padding-bottom: 10px

        &:last-of-type
          padding-bottom: 0
</style>

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
				<div id="snap-shot-trigger">
          <button on:click={takeSnapShot}>&nbsp;</button>
        </div>
        <div>&nbsp;</div>
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
