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

    // === POSE STATE ===
    const poseState = {
      current: { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      target: { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      transitionSpeed: 0.02,
      nextChangeTime: 3,
      idleTime: 0
    }

    // Poses yang sinkron kepala + badan
    const poses = [
      // Center / netral
      { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      
      // Nengok kanan - badan ikut serong kanan sedikit
      { headY: 0.15, headX: 0, headZ: 0, spineY: 0.05, spineZ: 0, chestY: 0.03 },
      { headY: 0.2, headX: 0.03, headZ: 0, spineY: 0.08, spineZ: 0, chestY: 0.05 },
      
      // Nengok kiri - badan ikut serong kiri sedikit
      { headY: -0.15, headX: 0, headZ: 0, spineY: -0.05, spineZ: 0, chestY: -0.03 },
      { headY: -0.2, headX: 0.03, headZ: 0, spineY: -0.08, spineZ: 0, chestY: -0.05 },
      
      // Miring kanan - kepala & badan miring bareng
      { headY: 0.05, headX: 0, headZ: 0.1, spineY: 0.02, spineZ: 0.03, chestY: 0 },
      
      // Miring kiri
      { headY: -0.05, headX: 0, headZ: -0.1, spineY: -0.02, spineZ: -0.03, chestY: 0 },
      
      // Curious kanan - nengok + miring
      { headY: 0.12, headX: 0.04, headZ: 0.08, spineY: 0.04, spineZ: 0.02, chestY: 0.03 },
      
      // Curious kiri
      { headY: -0.12, headX: 0.04, headZ: -0.08, spineY: -0.04, spineZ: -0.02, chestY: -0.03 },
      
      // Thinking - lihat atas, badan agak condong
      { headY: 0.05, headX: 0.08, headZ: 0.06, spineY: 0.02, spineZ: 0.02, chestY: 0 },
      
      // Shy/malu - lihat bawah, badan agak membungkuk
      { headY: 0, headX: -0.1, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      
      // Relax kanan - santai condong ke kanan
      { headY: 0.08, headX: 0, headZ: 0.05, spineY: 0.03, spineZ: 0.04, chestY: 0.02 },
      
      // Relax kiri
      { headY: -0.08, headX: 0, headZ: -0.05, spineY: -0.03, spineZ: -0.04, chestY: -0.02 },
    ]

    function getRandomPose() {
      return poses[Math.floor(Math.random() * poses.length)]
    }

    function getRandomInterval() {
      return 2.5 + Math.random() * 4 // 2.5-6.5 detik
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
        const breathe = Math.sin(time * 2) * 0.002
        vrm.scene.position.y = breathe

        // === POSE SYSTEM - Kepala & Badan sinkron ===
        poseState.idleTime += delta

        if (poseState.idleTime > poseState.nextChangeTime) {
          poseState.target = getRandomPose()
          poseState.nextChangeTime = getRandomInterval()
          poseState.idleTime = 0
          poseState.transitionSpeed = 0.012 + Math.random() * 0.015
        }

        // Smooth lerp semua nilai
        const lerp = poseState.transitionSpeed
        poseState.current.headY += (poseState.target.headY - poseState.current.headY) * lerp
        poseState.current.headX += (poseState.target.headX - poseState.current.headX) * lerp
        poseState.current.headZ += (poseState.target.headZ - poseState.current.headZ) * lerp
        poseState.current.spineY += (poseState.target.spineY - poseState.current.spineY) * lerp
        poseState.current.spineZ += (poseState.target.spineZ - poseState.current.spineZ) * lerp
        poseState.current.chestY += (poseState.target.chestY - poseState.current.chestY) * lerp

        // Micro movement
        const microX = Math.sin(time * 0.8) * 0.003
        const microY = Math.sin(time * 0.6) * 0.003
        const microZ = Math.sin(time * 0.5) * 0.002

        // Apply ke kepala
        const head = vrm.humanoid?.getNormalizedBoneNode('head')
        if (head) {
          head.rotation.y = poseState.current.headY + microY
          head.rotation.x = poseState.current.headX + microX
          head.rotation.z = poseState.current.headZ
        }

        // Apply ke spine (pinggang)
        const spine = vrm.humanoid?.getNormalizedBoneNode('spine')
        if (spine) {
          spine.rotation.y = poseState.current.spineY + microY * 0.3
          spine.rotation.z = poseState.current.spineZ + microZ
        }

        // Apply ke chest (dada) - lebih subtle
        const chest = vrm.humanoid?.getNormalizedBoneNode('chest')
        if (chest) {
          chest.rotation.y = poseState.current.chestY + microY * 0.2
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