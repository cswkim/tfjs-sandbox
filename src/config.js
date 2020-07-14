export const blurConfig = {
  backgroundBlurAmount: 3,
  edgeBlurAmount: 3,
  faceBodyPartIdsToBlur: [0, 1],
  flipHorizontal: false
}

export const maskConfig = {
  flipHorizontal: false,
  maskBlurAmount: 0,
  opacity: 0.7,
  pixelCellWidth: 5.0
}

export const modelConfig = {
  architecture: 'MobileNetV1',
  multiplier: 1.0,
  outputStride: 16,
  quantBytes: 4
}

export const segmentationConfig = {
  flipHorizontal: false,
  internalResolution: 'high',
  segmentationThreshold: 0.7,
  maxDetections: 10,
  scoreThreshold: 0.4,
  nmsRadius: 20,
  minKeypointScore: 0.3,
  refineSteps: 10
}
