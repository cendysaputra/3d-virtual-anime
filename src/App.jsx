import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'

function App() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 1.3, 1)

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const keyLight = new THREE.DirectionalLight(0xfff0e6, 1.2)
    keyLight.position.set(2, 3, 2)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4)
    fillLight.position.set(-2, 1, 1)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6)
    rimLight.position.set(0, 2, -2)
    scene.add(rimLight)

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5)
    scene.add(ambientLight)

    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    let vrm = null
    const clock = new THREE.Clock()
    let frameCount = 0

    // === HEAD MOVEMENT STATE ===
    const headState = {
      currentPose: { y: 0, x: 0, z: 0 },
      targetPose: { y: 0, x: 0, z: 0 },
      transitionSpeed: 0.02,
      nextChangeTime: 3,
      idleTime: 0
    }

    // Random head poses
    const headPoses = [
      { y: 0, x: 0, z: 0, name: 'center' },
      { y: 0.15, x: 0, z: 0, name: 'look right' },
      { y: -0.15, x: 0, z: 0, name: 'look left' },
      { y: 0.08, x: 0.05, z: 0, name: 'look right up' },
      { y: -0.08, x: 0.05, z: 0, name: 'look left up' },
      { y: 0, x: -0.08, z: 0, name: 'look down' },
      { y: 0.05, x: 0, z: 0.08, name: 'tilt right' },
      { y: -0.05, x: 0, z: -0.08, name: 'tilt left' },
      { y: 0.1, x: 0.03, z: 0.05, name: 'curious right' },
      { y: -0.1, x: 0.03, z: -0.05, name: 'curious left' },
      { y: 0, x: 0.06, z: 0.06, name: 'thinking' },
    ]

    function getRandomPose() {
      return headPoses[Math.floor(Math.random() * headPoses.length)]
    }

    function getRandomInterval() {
      return 2 + Math.random() * 4 // 2-6 detik
    }

    loader.load('/cewaifu.vrm', (gltf) => {
      vrm = gltf.userData.vrm

      const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm')
      const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm')
      const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm')
      const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm')

      if (leftUpperArm) leftUpperArm.rotation.z = -Math.PI / 3
      if (rightUpperArm) rightUpperArm.rotation.z = Math.PI / 3
      if (leftLowerArm) leftLowerArm.rotation.x = -0.1
      if (rightLowerArm) rightLowerArm.rotation.x = -0.1

      vrm.scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true
          obj.receiveShadow = true
        }
      })

      if (vrm.springBoneManager) {
        vrm.springBoneManager.joints.forEach((joint) => {
          joint.settings.stiffness = 1.2
          joint.settings.dragForce = 0.3
        })
      }

      scene.add(vrm.scene)
    })

    function animate() {
      requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      if (vrm) {
        frameCount++

        if (frameCount < 30) {
          vrm.update(delta)
          renderer.render(scene, camera)
          return
        }

        // === WIND ===
        if (vrm.springBoneManager) {
          const wind1 = Math.sin(time * 0.7) * 0.08
          const wind2 = Math.sin(time * 1.1 + 1.5) * 0.05
          const wind3 = Math.sin(time * 0.3 + 0.8) * 0.03
          const windX = wind1 + wind2 + wind3
          const windZ = Math.cos(time * 0.5) * 0.03 + Math.cos(time * 0.9 + 2.0) * 0.02

          vrm.springBoneManager.joints.forEach((joint) => {
            joint.settings.gravityDir.set(windX, -1, windZ).normalize()
            joint.settings.gravityPower = 0.4
          })
        }

        // === BLINK ===
        const blinkBase = Math.floor(time / 3)
        const blinkOffset = Math.sin(blinkBase * 12.345) * 0.5
        const blinkCycle = (time + blinkOffset) % 3
        vrm.expressionManager?.setValue('blink', blinkCycle > 2.85 ? 1 : 0)

        // === NAPAS ===
        vrm.scene.position.y = Math.sin(time * 2) * 0.002

        // === HEAD MOVEMENT - Random poses ===
        headState.idleTime += delta

        // Ganti pose kalau sudah waktunya
        if (headState.idleTime > headState.nextChangeTime) {
          headState.targetPose = getRandomPose()
          headState.nextChangeTime = getRandomInterval()
          headState.idleTime = 0
          // Variasi speed transisi
          headState.transitionSpeed = 0.015 + Math.random() * 0.02
        }

        // Smooth lerp ke target pose
        headState.currentPose.y += (headState.targetPose.y - headState.currentPose.y) * headState.transitionSpeed
        headState.currentPose.x += (headState.targetPose.x - headState.currentPose.x) * headState.transitionSpeed
        headState.currentPose.z += (headState.targetPose.z - headState.currentPose.z) * headState.transitionSpeed

        const head = vrm.humanoid?.getNormalizedBoneNode('head')
        if (head) {
          // Base pose + micro movement biar gak kaku
          const microX = Math.sin(time * 0.8) * 0.005
          const microY = Math.sin(time * 0.6) * 0.005

          head.rotation.y = headState.currentPose.y + microY
          head.rotation.x = headState.currentPose.x + microX
          head.rotation.z = headState.currentPose.z
        }

        // === BADAN SWAY ===
        const spine = vrm.humanoid?.getNormalizedBoneNode('spine')
        if (spine) {
          spine.rotation.z = Math.sin(time * 0.4) * 0.008 + Math.sin(time * 0.19) * 0.005
        }

        // === TANGAN ===
        const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm')
        const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm')
        if (leftUpperArm) {
          leftUpperArm.rotation.z = -Math.PI / 3 + Math.sin(time * 0.6) * 0.02 + Math.sin(time * 0.27) * 0.01
          leftUpperArm.rotation.x = Math.sin(time * 0.4) * 0.015
        }
        if (leftLowerArm) {
          leftLowerArm.rotation.x = -0.1 + Math.sin(time * 0.5) * 0.015
        }

        const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm')
        const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm')
        if (rightUpperArm) {
          rightUpperArm.rotation.z = Math.PI / 3 + Math.sin(time * 0.7) * 0.02 + Math.sin(time * 0.31) * 0.01
          rightUpperArm.rotation.x = Math.sin(time * 0.5) * 0.015
        }
        if (rightLowerArm) {
          rightLowerArm.rotation.x = -0.1 + Math.sin(time * 0.6) * 0.015
        }

        vrm.update(delta)
      }

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

export default App