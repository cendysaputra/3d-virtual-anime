import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'

function App() {
  const canvasRef = useRef(null)

  useEffect(() => {
    // === SETUP SCENE (TETAP SAMA) ===
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)

    const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 1.3, 1)

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Lights
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

    // === LOGIKA INTERAKSI & KEBOSANAN ===
    let lastInteractionTime = 0 
    
    const boredState = {
        isBored: false,
        timer: 0,
        duration: 8.0,      // Total durasi joget
        triggerTime: 120,   // 2 menit menunggu
        rhythmSpeed: 4,     // Kecepatan ayunan (Sedikit diperlambat biar chill)
        fadeDuration: 2.0   // Butuh 2 detik buat mulai & berhenti pelan-pelan (SMOOTHING)
    }

    // === POSE STATE ===
    const poseState = {
      current: { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      target: { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      transitionSpeed: 0.02,
      nextChangeTime: 3,
      idleTime: 0
    }

    // === ARRAY POSES ===
    const poses = [
      { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      { headY: 0.15, headX: 0, headZ: 0, spineY: 0.05, spineZ: 0, chestY: 0.03 },
      { headY: 0.2, headX: 0.03, headZ: 0, spineY: 0.08, spineZ: 0, chestY: 0.05 },
      { headY: -0.15, headX: 0, headZ: 0, spineY: -0.05, spineZ: 0, chestY: -0.03 },
      { headY: -0.2, headX: 0.03, headZ: 0, spineY: -0.08, spineZ: 0, chestY: -0.05 },
      { headY: 0.05, headX: 0, headZ: 0.1, spineY: 0.02, spineZ: 0.03, chestY: 0 },
      { headY: -0.05, headX: 0, headZ: -0.1, spineY: -0.02, spineZ: -0.03, chestY: 0 },
      { headY: 0.12, headX: 0.04, headZ: 0.08, spineY: 0.04, spineZ: 0.02, chestY: 0.03 },
      { headY: -0.12, headX: 0.04, headZ: -0.08, spineY: -0.04, spineZ: -0.02, chestY: -0.03 },
      { headY: 0.05, headX: 0.08, headZ: 0.06, spineY: 0.02, spineZ: 0.02, chestY: 0 },
      { headY: 0, headX: -0.1, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      { headY: 0.08, headX: 0, headZ: 0.05, spineY: 0.03, spineZ: 0.04, chestY: 0.02 },
      { headY: -0.08, headX: 0, headZ: -0.05, spineY: -0.03, spineZ: -0.04, chestY: -0.02 },
    ]

    function getRandomPose() {
      return poses[Math.floor(Math.random() * poses.length)]
    }
    function getRandomInterval() {
      return 2.5 + Math.random() * 4
    }

    // === RESET TIMER (INTERAKSI) ===
    const resetIdleTimer = () => {
        lastInteractionTime = clock.getElapsedTime()
        
        // Kalau lagi joget dan di-klik, hentikan dengan halus
        if (boredState.isBored) {
            boredState.isBored = false
            boredState.timer = 0
            poseState.target = { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
            // Transisi balik ke normal agak pelan biar gak kaget
            poseState.transitionSpeed = 0.03 
        }
    }

    // Event Listener
    window.addEventListener('click', resetIdleTimer)
    window.addEventListener('keydown', resetIdleTimer)

    loader.load('/cewaifu.vrm', (gltf) => {
      vrm = gltf.userData.vrm
      // Setup Tulang
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

        // Logic Angin
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

        // === LOGIKA CEK INTERAKSI ===
        const timeSinceLastInteraction = time - lastInteractionTime
        
        // Trigger Bosen (2 Menit)
        if (!boredState.isBored && timeSinceLastInteraction > boredState.triggerTime) {
            boredState.isBored = true
            boredState.timer = 0
            
            // Reset posisi ke tengah
            poseState.target = { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
            poseState.transitionSpeed = 0.04
        }

        // Variabel untuk menyimpan Offset Joget
        let danceSpineZ = 0
        let danceChestY = 0
        let danceHeadX = 0
        let danceHeadZ = 0

        // LOGIKA SAAT JOGET (DENGAN SMOOTHING)
        if (boredState.isBored) {
            boredState.timer += delta
            
            // === INTENSITY CALCULATION (KUNCI AGAR SMOOTH) ===
            // 1. Fade In: Timer awal (0 -> 2 detik) naik dari 0 ke 1
            const fadeIn = Math.min(boredState.timer / boredState.fadeDuration, 1)
            
            // 2. Fade Out: Sisa waktu akhir (2 detik terakhir) turun dari 1 ke 0
            const timeLeft = boredState.duration - boredState.timer
            const fadeOut = Math.min(timeLeft / boredState.fadeDuration, 1)

            // Intensitas akhir adalah kombinasi keduanya (ambil yang paling kecil)
            // Jadi: 0 -> naik -> 1 (tahan) -> turun -> 0
            const intensity = Math.min(fadeIn, fadeOut)
            
            // Kalau timer sudah habis, intensity otomatis 0, jadi gak akan 'deg' saat berhenti
            if (intensity < 0) {
                 boredState.isBored = false
                 lastInteractionTime = time
                 poseState.target = getRandomPose()
            } else {
                // Kalkulasi gerakan dikalikan intensity
                const rhythm = time * boredState.rhythmSpeed
                
                danceSpineZ = Math.sin(rhythm) * 0.06 * intensity
                danceChestY = Math.cos(rhythm) * 0.03 * intensity
                danceHeadX = Math.abs(Math.sin(rhythm)) * 0.05 * intensity
                danceHeadZ = Math.sin(rhythm) * 0.03 * intensity
            }

        } else {
            // === MODE RANDOM (SAAT TIDAK BOSAN) ===
            poseState.idleTime += delta
            if (poseState.idleTime > poseState.nextChangeTime) {
                poseState.target = getRandomPose()
                poseState.nextChangeTime = getRandomInterval()
                poseState.idleTime = 0
                poseState.transitionSpeed = 0.012 + Math.random() * 0.015
            }
        }

        // LERP MOVEMENT
        const lerp = poseState.transitionSpeed
        poseState.current.headY += (poseState.target.headY - poseState.current.headY) * lerp
        poseState.current.headX += (poseState.target.headX - poseState.current.headX) * lerp
        poseState.current.headZ += (poseState.target.headZ - poseState.current.headZ) * lerp
        poseState.current.spineY += (poseState.target.spineY - poseState.current.spineY) * lerp
        poseState.current.spineZ += (poseState.target.spineZ - poseState.current.spineZ) * lerp
        poseState.current.chestY += (poseState.target.chestY - poseState.current.chestY) * lerp

        // Micro movement (Napas)
        const microX = Math.sin(time * 0.8) * 0.003
        const microY = Math.sin(time * 0.6) * 0.003
        const microZ = Math.sin(time * 0.5) * 0.002

        // APPLY BONES
        const head = vrm.humanoid?.getNormalizedBoneNode('head')
        if (head) {
            head.rotation.y = poseState.current.headY + microY
            head.rotation.x = poseState.current.headX + microX + danceHeadX
            head.rotation.z = poseState.current.headZ + danceHeadZ
        }
        const spine = vrm.humanoid?.getNormalizedBoneNode('spine')
        if (spine) {
            spine.rotation.y = poseState.current.spineY + microY * 0.3
            spine.rotation.z = poseState.current.spineZ + microZ + danceSpineZ
        }
        const chest = vrm.humanoid?.getNormalizedBoneNode('chest')
        if (chest) {
             chest.rotation.y = poseState.current.chestY + microY * 0.2 + danceChestY
        }

        // === EKSPRESI & MATA ===
        // Blink logic tetap jalan
        const blinkBase = Math.floor(time / 3)
        const blinkOffset = Math.sin(blinkBase * 12.345) * 0.5
        const blinkCycle = (time + blinkOffset) % 3
        const blinkVal = blinkCycle > 2.85 ? 1 : 0
        
        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', blinkVal)
            // Saya hapus logika 'happy' di sini sesuai request, jadi mata normal aja
        }
        
        vrm.scene.position.y = Math.sin(time * 2) * 0.002

        // Tangan
        const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm')
        const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm')
        if (leftUpperArm) {
             leftUpperArm.rotation.z = -Math.PI / 3 + Math.sin(time * 0.6) * 0.02 + Math.sin(time * 0.27) * 0.01
             leftUpperArm.rotation.x = Math.sin(time * 0.4) * 0.015
        }
        if (leftLowerArm) leftLowerArm.rotation.x = -0.1 + Math.sin(time * 0.5) * 0.015
        
        const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm')
        const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm')
        if (rightUpperArm) {
             rightUpperArm.rotation.z = Math.PI / 3 + Math.sin(time * 0.7) * 0.02 + Math.sin(time * 0.31) * 0.01
             rightUpperArm.rotation.x = Math.sin(time * 0.5) * 0.015
        }
        if (rightLowerArm) rightLowerArm.rotation.x = -0.1 + Math.sin(time * 0.6) * 0.015

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
        window.removeEventListener('click', resetIdleTimer)
        window.removeEventListener('keydown', resetIdleTimer)
        window.removeEventListener('resize', handleResize)
        renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

export default App