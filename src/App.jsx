import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'

function App() {
  const canvasRef = useRef(null)

  useEffect(() => {
    // === SETUP SCENE ===
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
        duration: 8.0,
        triggerTime: 120,
        rhythmSpeed: 4,
        fadeDuration: 2.0
    }

    // === LOGIKA BERSIN & MALU ===
    const sneezeState = {
        active: false,
        timer: 0,
        phase1Duration: 1.5, // "Haa..." (Kepala mundur)
        phase2Duration: 0.2, // "CHOO!" (Kepala maju)
        phase3Duration: 0.5, // Recovery
        phase4Duration: 2.5  // Malu
    }

    const triggerSneeze = () => {
        if (!sneezeState.active) {
            console.log("Sneeze triggered!")
            sneezeState.active = true
            sneezeState.timer = 0
            boredState.isBored = false
            poseState.target = { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
        }
    }

    // === LOGIKA MATA (EYES) ===
    const eyeState = {
        currentY: 0, currentX: 0, targetY: 0, targetX: 0,
        timeSinceLastMove: 0, moveInterval: 2.0, isGlancing: false
    }

    function getRandomEyeGlance() {
        const roll = Math.random();
        let y = 0, x = 0;
        if (roll < 0.45) y = 0.03 + Math.random() * 0.03; 
        else if (roll < 0.90) y = -0.03 - Math.random() * 0.03; 
        else x = 0.04; 
        return { y, x };
    }

    // === POSE STATE ===
    const poseState = {
      current: { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      target: { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 },
      transitionSpeed: 0.02, nextChangeTime: 3, idleTime: 0
    }

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

    function getRandomPose() { return poses[Math.floor(Math.random() * poses.length)] }
    function getRandomInterval() { return 2.5 + Math.random() * 4 }

    // === EVENT LISTENERS ===
    const resetIdleTimer = () => {
        lastInteractionTime = clock.getElapsedTime()
        if (boredState.isBored) {
            boredState.isBored = false
            boredState.timer = 0
            poseState.target = { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
            poseState.transitionSpeed = 0.03 
        }
    }

    const handleContextMenu = (e) => { e.preventDefault(); return false; }
    const handleCopy = (e) => { e.preventDefault(); return false; }
    
    const handleKeyDown = (e) => {
        resetIdleTimer();
        if (e.key.toLowerCase() === 's') {
            triggerSneeze();
        }
    }

    window.addEventListener('click', resetIdleTimer)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('copy', handleCopy)
    window.addEventListener('cut', handleCopy)

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

      vrm.scene.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true } })
      if (vrm.springBoneManager) {
        vrm.springBoneManager.joints.forEach((joint) => { joint.settings.stiffness = 1.2; joint.settings.dragForce = 0.3 })
      }
      scene.add(vrm.scene)
    })

    function animate() {
      requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      if (vrm) {
        frameCount++
        if (frameCount < 30) { vrm.update(delta); renderer.render(scene, camera); return }

        // Logic Angin
        if (vrm.springBoneManager) {
          const windX = Math.sin(time * 0.7) * 0.08 + Math.sin(time * 1.1 + 1.5) * 0.05 + Math.sin(time * 0.3 + 0.8) * 0.03
          const windZ = Math.cos(time * 0.5) * 0.03 + Math.cos(time * 0.9 + 2.0) * 0.02
          vrm.springBoneManager.joints.forEach((joint) => { joint.settings.gravityDir.set(windX, -1, windZ).normalize(); joint.settings.gravityPower = 0.4 })
        }

        // === LOGIKA ANIMASI UTAMA ===
        
        // Cek Trigger Bosan
        const timeSinceLastInteraction = time - lastInteractionTime
        if (!sneezeState.active && !boredState.isBored && timeSinceLastInteraction > boredState.triggerTime) {
            boredState.isBored = true
            boredState.timer = 0
            poseState.target = { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
            poseState.transitionSpeed = 0.04
        }

        let danceSpineZ = 0, danceChestY = 0, danceHeadX = 0, danceHeadZ = 0
        let blinkOverride = -1 // -1 artinya pakai logic blink biasa
        let mouthOpenOverride = 0
        let sorrowOverride = 0

        // 1. LOGIKA BERSIN & MALU (Head & Expression Only)
        if (sneezeState.active) {
            sneezeState.timer += delta
            const { phase1Duration, phase2Duration, phase3Duration, phase4Duration } = sneezeState
            
            // PHASE 1: BUILD UP ("Haaa...")
            if (sneezeState.timer < phase1Duration) {
                const progress = sneezeState.timer / phase1Duration
                poseState.target = { headY: 0, headX: -0.3 * progress, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
                poseState.transitionSpeed = 0.02
                blinkOverride = progress
                mouthOpenOverride = progress * 0.3
            } 
            // PHASE 2: RELEASE ("CHOO!")
            else if (sneezeState.timer < phase1Duration + phase2Duration) {
                poseState.target = { headY: 0, headX: 0.6, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
                poseState.transitionSpeed = 0.4 
                blinkOverride = 1
                mouthOpenOverride = 1.0 
            } 
            // PHASE 3: RECOVERY
            else if (sneezeState.timer < phase1Duration + phase2Duration + phase3Duration) {
                poseState.target = { headY: 0, headX: 0, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
                poseState.transitionSpeed = 0.05
                blinkOverride = 0
                mouthOpenOverride = 0
            }
            // === FASE 4: SHY / MALU ===
            else if (sneezeState.timer < phase1Duration + phase2Duration + phase3Duration + phase4Duration) {
                poseState.target = { headY: 0.15, headX: 0.15, headZ: 0, spineY: 0, spineZ: 0, chestY: 0 }
                poseState.transitionSpeed = 0.03
                sorrowOverride = 1.0 
                blinkOverride = 0
                mouthOpenOverride = 0
            }
            // SELESAI
            else {
                sneezeState.active = false
                poseState.target = getRandomPose()
            }

        } 
        // 2. LOGIKA JOGET
        else if (boredState.isBored) {
            boredState.timer += delta
            const fadeIn = Math.min(boredState.timer / boredState.fadeDuration, 1)
            const fadeOut = Math.min((boredState.duration - boredState.timer) / boredState.fadeDuration, 1)
            const intensity = Math.min(fadeIn, fadeOut)
            
            if (intensity < 0) {
                 boredState.isBored = false
                 lastInteractionTime = time
                 poseState.target = getRandomPose()
            } else {
                const rhythm = time * boredState.rhythmSpeed
                danceSpineZ = Math.sin(rhythm) * 0.06 * intensity
                danceChestY = Math.cos(rhythm) * 0.03 * intensity
                danceHeadX = Math.abs(Math.sin(rhythm)) * 0.05 * intensity
                danceHeadZ = Math.sin(rhythm) * 0.03 * intensity
            }
        } 
        // 3. LOGIKA IDLE
        else {
            poseState.idleTime += delta
            if (poseState.idleTime > poseState.nextChangeTime) {
                poseState.target = getRandomPose(); poseState.nextChangeTime = getRandomInterval(); poseState.idleTime = 0;
                poseState.transitionSpeed = 0.012 + Math.random() * 0.015
            }
        }

        // === UPDATE LOGIKA MATA ===
        if (!sneezeState.active) {
            eyeState.timeSinceLastMove += delta
            if (eyeState.timeSinceLastMove > eyeState.moveInterval) {
                eyeState.timeSinceLastMove = 0
                if (eyeState.isGlancing) {
                    eyeState.targetY = 0; eyeState.targetX = 0; eyeState.isGlancing = false; eyeState.moveInterval = 2.0 + Math.random() * 3.0
                } else {
                    const glance = getRandomEyeGlance()
                    const keepEyeContactBias = -poseState.current.headY * 0.3; 
                    eyeState.targetY = glance.y + keepEyeContactBias;
                    if (eyeState.targetY > 0.08) eyeState.targetY = 0.08;
                    if (eyeState.targetY < -0.08) eyeState.targetY = -0.08;
                    eyeState.targetX = glance.x; eyeState.isGlancing = true; eyeState.moveInterval = 0.5 + Math.random() * 1.0
                }
            }
            const eyeLerp = 0.1
            eyeState.currentY += (eyeState.targetY - eyeState.currentY) * eyeLerp
            eyeState.currentX += (eyeState.targetX - eyeState.currentX) * eyeLerp
        } else {
            eyeState.currentY = 0
            eyeState.currentX = 0
        }

        // LERP MOVEMENT BADAN
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

        // APPLY BONES (HEAD, SPINE, CHEST)
        const head = vrm.humanoid?.getNormalizedBoneNode('head')
        if (head) {
            head.rotation.y = poseState.current.headY + microY
            head.rotation.x = poseState.current.headX + microX + danceHeadX
            head.rotation.z = poseState.current.headZ + danceHeadZ
        }
        const spine = vrm.humanoid?.getNormalizedBoneNode('spine')
        if (spine) {
            const bodyFollowHeadY = poseState.current.headY * 0.2; 
            const bodyFollowHeadZ = poseState.current.headZ * 0.1; 
            spine.rotation.y = poseState.current.spineY + microY * 0.3 + bodyFollowHeadY
            spine.rotation.z = poseState.current.spineZ + microZ + danceSpineZ + bodyFollowHeadZ
        }
        const chest = vrm.humanoid?.getNormalizedBoneNode('chest')
        if (chest) { 
            const chestFollowHeadY = poseState.current.headY * 0.1;
            chest.rotation.y = poseState.current.chestY + microY * 0.2 + danceChestY + chestFollowHeadY
        }

        // APPLY MATA
        const leftEye = vrm.humanoid?.getNormalizedBoneNode('leftEye')
        const rightEye = vrm.humanoid?.getNormalizedBoneNode('rightEye')
        if (leftEye && rightEye) {
             leftEye.rotation.y = eyeState.currentY; leftEye.rotation.x = eyeState.currentX;
             rightEye.rotation.y = eyeState.currentY; rightEye.rotation.x = eyeState.currentX;
        }

        // === EKSPRESI ===
        const blinkBase = Math.floor(time / 3)
        const blinkOffset = Math.sin(blinkBase * 12.345) * 0.5
        const blinkCycle = (time + blinkOffset) % 3
        let finalBlink = blinkCycle > 2.85 ? 1 : 0
        
        if (blinkOverride !== -1) {
            finalBlink = blinkOverride
        }

        if (vrm.expressionManager) {
            vrm.expressionManager.setValue('blink', finalBlink)
            vrm.expressionManager.setValue('sorrow', sorrowOverride)

            if (sneezeState.active) {
                vrm.expressionManager.setValue('aa', mouthOpenOverride)
                if (mouthOpenOverride > 0.5) vrm.expressionManager.setValue('joy', 0.5);
                else vrm.expressionManager.setValue('joy', 0);
            } else {
                vrm.expressionManager.setValue('aa', 0)
                vrm.expressionManager.setValue('joy', 0)
            }
        }
        
        vrm.scene.position.y = Math.sin(time * 2) * 0.002

        // === UPDATE GERAKAN TANGAN ===
        const leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm')
        const leftLowerArm = vrm.humanoid?.getNormalizedBoneNode('leftLowerArm')
        const rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm')
        const rightLowerArm = vrm.humanoid?.getNormalizedBoneNode('rightLowerArm')

        // Default Idle Arms
        let rArmZ = Math.PI / 3 + Math.sin(time * 0.7) * 0.02 + Math.sin(time * 0.31) * 0.01
        let rArmX = Math.sin(time * 0.5) * 0.015
        let rForeArmX = -0.1 + Math.sin(time * 0.6) * 0.015

        // NOTE: Logika tangan naik saat bersin (override) telah DIHAPUS.
        // Tangan akan tetap menggunakan kalkulasi Idle di atas.

        // Apply Left Arm (Standard Idle)
        if (leftUpperArm) {
             leftUpperArm.rotation.z = -Math.PI / 3 + Math.sin(time * 0.6) * 0.02 + Math.sin(time * 0.27) * 0.01
             leftUpperArm.rotation.x = Math.sin(time * 0.4) * 0.015
        }
        if (leftLowerArm) leftLowerArm.rotation.x = -0.1 + Math.sin(time * 0.5) * 0.015

        // Apply Right Arm (Idle only)
        if (rightUpperArm) {
             rightUpperArm.rotation.z = rArmZ
             rightUpperArm.rotation.x = rArmX
        }
        if (rightLowerArm) rightLowerArm.rotation.x = rForeArmX

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
        window.removeEventListener('keydown', handleKeyDown) 
        window.removeEventListener('contextmenu', handleContextMenu)
        window.removeEventListener('copy', handleCopy)
        window.removeEventListener('cut', handleCopy)
        window.removeEventListener('resize', handleResize)
        renderer.dispose()
    }
  }, [])

  return <canvas
    ref={canvasRef}
    style={{
      display: 'block',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none'
    }}
  />
}

export default App