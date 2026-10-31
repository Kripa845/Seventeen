import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type StickMode = 'steady' | 'pulse' | 'wave' | 'members' | 'carat'

/**
 * The Moonpetal light stick (model MP-01) in 3D: a pearl handle wrapped in twin LED ribbons, holding a
 * ringed glass orb with a floating crescent and star. It is always lit here; the glow follows concert
 * mode's colour and mode. Drag to spin it, tap it for a flash. Loaded lazily, as three.js is heavy.
 */
export default function MoonpetalStick({ color, color2, mode, onFail }: {
  color: string
  color2: string
  mode: StickMode
  onFail?: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  // the render loop reads the latest props from here, so changing a colour doesn't rebuild the scene
  const props = useRef({ color, color2, mode })
  props.current = { color, color2, mode }

  useEffect(() => {
    const stage = host.current
    if (!stage) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      onFail?.()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.setClearColor(0x000000, 0)
    stage.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0.4, 0.9, 12.5)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, -0.35, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enablePan = false
    controls.enableZoom = false
    controls.autoRotate = !reduce
    controls.autoRotateSpeed = 1.4

    // a soft pastel room for the pearl and glass to reflect
    {
      const pm = new THREE.PMREMGenerator(renderer)
      const env = new THREE.Scene()
      const g = new THREE.SphereGeometry(10, 32, 16)
      const cols: number[] = []
      const top = new THREE.Color('#e9dcff'), mid = new THREE.Color('#fff0ea'), bot = new THREE.Color('#d8f6ec')
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) {
        const t = p.getY(i) / 10
        const c = new THREE.Color()
        if (t > 0) c.copy(mid).lerp(top, t)
        else c.copy(mid).lerp(bot, -t)
        cols.push(c.r, c.g, c.b)
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
      env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })))
      const panel = (x: number, y: number, z: number, w: number, h: number, c: THREE.Color) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }))
        m.position.set(x, y, z)
        m.lookAt(0, 0, 0)
        env.add(m)
      }
      panel(-5, 5, 6, 5, 3, new THREE.Color(3.2, 3.0, 3.4))
      panel(6, 2, 3, 3, 5, new THREE.Color(2.6, 2.2, 2.0))
      panel(0, -3, -7, 6, 2, new THREE.Color(1.6, 2.2, 2.6))
      scene.environment = pm.fromScene(env, 0.04).texture
      env.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          o.material.dispose()
        }
      })
      pm.dispose()
    }

    // three's lights are physical now: π × the old intensities gives the original look
    scene.add(new THREE.HemisphereLight(0xf4ecff, 0xe2f6ef, 0.7 * Math.PI))
    const key = new THREE.DirectionalLight(0xffffff, 1.4 * Math.PI)
    key.position.set(-4, 6, 6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xffd9ec, 0.9 * Math.PI)
    rim.position.set(5, 2, -5)
    scene.add(rim)

    const canvasTex = (w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      draw(c.getContext('2d')!, w, h)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      return t
    }
    const radialTex = canvasTex(128, 128, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.25, 'rgba(255,255,255,.55)')
      g.addColorStop(0.6, 'rgba(255,255,255,.12)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      x.fillStyle = g
      x.fillRect(0, 0, w, h)
    })
    const dotTex = canvasTex(64, 64, (x, w, h) => {
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.35, 'rgba(255,255,255,.8)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      x.fillStyle = g
      x.fillRect(0, 0, w, h)
    })

    const stick = new THREE.Group()
    scene.add(stick)
    const hitMeshes: THREE.Object3D[] = []
    const glowMats: { mat: THREE.MeshPhysicalMaterial; k: number }[] = []
    const add = <T extends THREE.Mesh>(mesh: T) => {
      stick.add(mesh)
      hitMeshes.push(mesh)
      return mesh
    }

    /* handle */
    const profile: [number, number][] = [[0, -3.36], [0.28, -3.36], [0.39, -3.31], [0.44, -3.2], [0.45, -3.02], [0.41, -2.86], [0.37, -2.62], [0.345, -2.1], [0.35, -1.5], [0.375, -0.9], [0.415, -0.4], [0.47, -0.02]]
    const handleGeo = new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), 96)
    {
      const pos = handleGeo.attributes.position
      const cols: number[] = []
      const a = new THREE.Color('#c9f0e2'), b = new THREE.Color('#ddd0ff'), c = new THREE.Color('#ffd9cc')
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getY(i) + 3.36) / 3.36
        const col = new THREE.Color()
        if (t < 0.5) col.copy(a).lerp(b, t / 0.5)
        else col.copy(b).lerp(c, (t - 0.5) / 0.5)
        cols.push(col.r, col.g, col.b)
      }
      handleGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
    }
    add(new THREE.Mesh(handleGeo, new THREE.MeshPhysicalMaterial({
      color: 0xffffff, vertexColors: true, roughness: 0.32, metalness: 0.05,
      clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.55, iridescenceIOR: 1.35, sheen: 0.6, sheenColor: new THREE.Color('#fff3fb'),
    })))

    const radiusAt = (y: number) => {
      for (let i = 0; i < profile.length - 1; i++) {
        const [r0, y0] = profile[i], [r1, y1] = profile[i + 1]
        if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0)
      }
      return 0.4
    }
    /* twin spiral LED ribbons */
    const ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1, clearcoat: 1, iridescence: 0.9, iridescenceIOR: 1.5, emissive: 0xffffff, emissiveIntensity: 0 })
    glowMats.push({ mat: ribbonMat, k: 1.3 })
    for (let s = 0; s < 2; s++) {
      const pts: THREE.Vector3[] = []
      const y0 = -2.72, y1 = -0.32, turns = 2.25
      for (let i = 0; i <= 160; i++) {
        const t = i / 160, y = y0 + (y1 - y0) * t, a = s * Math.PI + t * turns * Math.PI * 2, r = radiusAt(y) + 0.012
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r))
      }
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.034, 10, false), ribbonMat))
    }
    /* LED band near the base */
    const bandMat = new THREE.MeshPhysicalMaterial({ color: 0xfdf8ff, roughness: 0.15, transmission: 0.4, thickness: 0.2, emissive: 0xffffff, emissiveIntensity: 0 })
    glowMats.push({ mat: bandMat, k: 1.6 })
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.452, 0.452, 0.07, 64), bandMat)).position.y = -2.94
    /* strap loop */
    add(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 12, 40), new THREE.MeshPhysicalMaterial({ color: 0xf3eefe, roughness: 0.25, metalness: 0.6, clearcoat: 1 }))).position.y = -3.47

    /* emblem collar: a crescent cradling a four-point spark, and the name */
    const drawEmblem = (x: CanvasRenderingContext2D, cx: number, cy: number, s: number, col: string) => {
      const off = document.createElement('canvas')
      off.width = off.height = Math.ceil(s * 2.4)
      const o = off.getContext('2d')!
      const m = off.width / 2
      o.fillStyle = col
      o.beginPath()
      o.arc(m, m, s, 0, Math.PI * 2)
      o.fill()
      o.globalCompositeOperation = 'destination-out'
      o.beginPath()
      o.arc(m + s * 0.42, m - s * 0.18, s * 0.86, 0, Math.PI * 2)
      o.fill()
      o.globalCompositeOperation = 'source-over'
      o.fillStyle = col
      const sx = m + s * 0.55, sy = m - s * 0.1, r = s * 0.42
      o.beginPath()
      o.moveTo(sx, sy - r)
      o.quadraticCurveTo(sx, sy, sx + r * 0.62, sy)
      o.quadraticCurveTo(sx, sy, sx, sy + r)
      o.quadraticCurveTo(sx, sy, sx - r * 0.62, sy)
      o.quadraticCurveTo(sx, sy, sx, sy - r)
      o.fill()
      x.drawImage(off, cx - m, cy - m)
    }
    const collarCanvas = document.createElement('canvas')
    collarCanvas.width = 2048
    collarCanvas.height = 160
    const collarTex = new THREE.CanvasTexture(collarCanvas)
    collarTex.colorSpace = THREE.SRGBColorSpace
    collarTex.anisotropy = 8
    {
      const x = collarCanvas.getContext('2d')!
      const w = 2048, h = 160
      const g = x.createLinearGradient(0, 0, w, 0)
      ;['#d9c9ff', '#ffd3c2', '#c6f1e1', '#cfe3ff', '#d9c9ff'].forEach((c, i) => g.addColorStop(i / 4, c))
      x.fillStyle = g
      x.fillRect(0, 0, w, h)
      const sh = x.createLinearGradient(0, 0, 0, h)
      sh.addColorStop(0, 'rgba(255,255,255,.65)')
      sh.addColorStop(0.45, 'rgba(255,255,255,0)')
      sh.addColorStop(1, 'rgba(120,100,180,.18)')
      x.fillStyle = sh
      x.fillRect(0, 0, w, h)
      x.fillStyle = 'rgba(255,255,255,.85)'
      x.fillRect(0, 10, w, 3)
      x.fillRect(0, h - 13, w, 3)
      const reps = 3, cell = w / reps
      for (let i = 0; i < reps; i++) {
        const cx = cell * i + cell * 0.5
        drawEmblem(x, cx - 150, h / 2, 36, '#ffffff')
        x.save()
        x.fillStyle = '#ffffff'
        x.shadowColor = 'rgba(110,90,170,.35)'
        x.shadowBlur = 6
        x.font = "400 64px 'Cormorant Garamond', Didot, Georgia, serif"
        x.textBaseline = 'middle'
        let px = cx - 90
        for (const ch of 'MOONPETAL') {
          x.fillText(ch, px, h / 2 + 3)
          px += x.measureText(ch).width + 10
        }
        x.restore()
        x.fillStyle = 'rgba(255,255,255,.9)'
        x.beginPath()
        x.arc(cell * i + 4, h / 2, 5, 0, 7)
        x.fill()
      }
      collarTex.needsUpdate = true
    }
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0xfbf7ff, roughness: 0.25, metalness: 0.3, clearcoat: 1, iridescence: 0.6 })
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.52, 0.36, 128, 1, false), [
      new THREE.MeshPhysicalMaterial({ map: collarTex, roughness: 0.28, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.35 }), capMat, capMat,
    ])).position.y = -0.2

    /* cradle cup */
    const cradlePts = [[0.5, -0.02], [0.56, 0.02], [0.68, 0.13], [0.84, 0.26], [0.99, 0.36], [1.04, 0.42], [1.0, 0.47], [0.9, 0.47], [0, 0.47]].map((p) => new THREE.Vector2(p[0], p[1]))
    add(new THREE.Mesh(new THREE.LatheGeometry(cradlePts, 128), new THREE.MeshPhysicalMaterial({ color: 0xf6f0ff, roughness: 0.18, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.85, iridescenceIOR: 1.6 })))

    /* orb */
    const ORB_Y = 1.27, ORB_R = 1.25
    const orbMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transmission: 1, thickness: 0.55, ior: 1.32, roughness: 0.06, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.04, attenuationColor: new THREE.Color('#e6dcff'), attenuationDistance: 4,
      iridescence: 0.45, iridescenceIOR: 1.3, envMapIntensity: 1.3, emissive: 0xffffff, emissiveIntensity: 0,
    })
    glowMats.push({ mat: orbMat, k: 0.22 })
    add(new THREE.Mesh(new THREE.SphereGeometry(ORB_R, 96, 64), orbMat)).position.y = ORB_Y

    const innerGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(ORB_R * 0.96, 48, 32), innerGlowMat)
    innerGlow.position.y = ORB_Y
    stick.add(innerGlow)

    /* saturn-style ring with three pearls */
    const ringGroup = new THREE.Group()
    ringGroup.position.y = ORB_Y
    ringGroup.rotation.set(Math.PI / 2 - 0.38, 0, 0.22)
    stick.add(ringGroup)
    const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xfffaff, roughness: 0.12, metalness: 0.55, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7, emissive: 0xffffff, emissiveIntensity: 0 })
    glowMats.push({ mat: ringMat, k: 0.5 })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.026, 14, 220), ringMat)
    ringGroup.add(ring)
    hitMeshes.push(ring)
    const pearlMat = new THREE.MeshPhysicalMaterial({ color: 0xfff6fb, roughness: 0.2, clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffd6ea'), iridescence: 0.7 })
    const pearls: { m: THREE.Mesh; a: number }[] = []
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.085 : 0.06, 24, 16), pearlMat)
      ringGroup.add(p)
      pearls.push({ m: p, a: i * 2.1 + 0.4 })
      hitMeshes.push(p)
    }
    add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 16), pearlMat)).position.y = ORB_Y + ORB_R + 0.05

    /* crescent + star inside */
    const inner = new THREE.Group()
    inner.position.y = ORB_Y + 0.05
    stick.add(inner)
    const cres = new THREE.Shape()
    cres.absarc(0, 0, 0.62, 1.09, Math.PI * 2 - 1.09, false)
    cres.absarc(0.3, 0, 0.55, -1.595 + Math.PI * 2, 1.595, true)
    const cresGeo = new THREE.ExtrudeGeometry(cres, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 6, curveSegments: 64 })
    cresGeo.center()
    const cresMat = new THREE.MeshPhysicalMaterial({ color: 0xfff4ec, roughness: 0.18, clearcoat: 1, transmission: 0.35, thickness: 0.4, iridescence: 0.5, emissive: 0xffffff, emissiveIntensity: 0 })
    glowMats.push({ mat: cresMat, k: 1.9 })
    const crescent = new THREE.Mesh(cresGeo, cresMat)
    crescent.scale.setScalar(1.05)
    crescent.rotation.z = 0.32
    crescent.position.x = -0.12
    inner.add(crescent)
    hitMeshes.push(crescent)
    const star = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.095 : 0.24, a = Math.PI / 2 + (i * Math.PI) / 5
      const x = Math.cos(a) * r, y = Math.sin(a) * r
      if (i) star.lineTo(x, y)
      else star.moveTo(x, y)
    }
    star.closePath()
    const starGeo = new THREE.ExtrudeGeometry(star, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 4 })
    starGeo.center()
    const starMat = new THREE.MeshPhysicalMaterial({ color: 0xffeef7, roughness: 0.15, clearcoat: 1, iridescence: 0.6, emissive: 0xffffff, emissiveIntensity: 0 })
    glowMats.push({ mat: starMat, k: 2.2 })
    const starMesh = new THREE.Mesh(starGeo, starMat)
    starMesh.position.set(0.36, 0.16, 0.05)
    inner.add(starMesh)
    hitMeshes.push(starMesh)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.42, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, roughness: 0.1, thickness: 0.1 }))
    stem.position.y = ORB_Y - 0.73
    stick.add(stem)

    /* sparkles */
    const N = 70
    const sp = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      let v: THREE.Vector3
      do v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      while (v.length() > 1)
      v.multiplyScalar(1.05)
      sp.set([v.x, v.y + ORB_Y, v.z], i * 3)
    }
    const spGeo = new THREE.BufferGeometry()
    spGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    const spMat = new THREE.PointsMaterial({ map: dotTex, size: 0.09, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff })
    const sparkles = new THREE.Points(spGeo, spMat)
    stick.add(sparkles)

    /* halo + light */
    const haloMat = new THREE.SpriteMaterial({ map: radialTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    const halo = new THREE.Sprite(haloMat)
    halo.position.y = ORB_Y
    halo.scale.setScalar(4.2)
    stick.add(halo)
    const bulb = new THREE.PointLight(0xffffff, 0, 7, 2)
    bulb.position.y = ORB_Y
    stick.add(bulb)

    /* tap the stick for a flash; a drag only spins it */
    let pulse = 1
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
    let down: { x: number; y: number; t: number } | null = null
    const hit = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      return ray.intersectObjects(hitMeshes, false).length > 0
    }
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, t: performance.now() } }
    const onUp = (e: PointerEvent) => {
      if (!down) return
      const still = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 450
      down = null
      if (still && hit(e)) pulse = 1
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.fov = w / h < 0.75 ? 44 : 34
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    resize()

    const glow = new THREE.Color(props.current.color), want = new THREE.Color(), tmp = new THREE.Color(), white = new THREE.Color(0xffffff)
    const clock = new THREE.Clock()
    let level = 0
    let raf = 0
    const frame = () => {
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime
      const { color: c1, color2: c2, mode } = props.current

      // pulse breathes slowly (well under one flash a second); the rest stay fully lit
      const target = mode === 'pulse' && !reduce ? 0.55 + 0.45 * Math.sin(t * 3.9) : 1
      level += (target - level) * Math.min(1, dt * 7)
      pulse = Math.max(0, pulse - dt * 1.6)

      // Rose Quartz & Serenity drifts between the two colours; otherwise ease toward the current one
      if (mode === 'carat') want.set(c1).lerp(tmp.set(c2), 0.5 + 0.5 * Math.sin(t * 0.9))
      else want.set(c1)
      glow.lerp(want, Math.min(1, dt * 4))

      const L = level
      glowMats.forEach((g) => {
        g.mat.emissive.copy(glow)
        g.mat.emissiveIntensity = L * g.k
      })
      orbMat.attenuationColor.set('#e6dcff').lerp(glow, L * 0.8)
      innerGlowMat.color.copy(glow)
      innerGlowMat.opacity = L * 0.2
      haloMat.color.copy(glow)
      haloMat.opacity = Math.min(1, L * 0.7 + pulse * 0.5)
      halo.scale.setScalar(4.2 + pulse * 1.6 + (mode === 'pulse' ? L * 0.4 : 0)) // kept inside the canvas, so its edge never shows
      bulb.color.copy(glow)
      bulb.intensity = L * 4 * Math.PI
      spMat.color.copy(glow).lerp(white, 0.35)
      spMat.opacity = L * 0.9
      spMat.size = 0.07 + L * 0.05

      if (!reduce) {
        inner.position.y = ORB_Y + 0.05 + Math.sin(t * 1.2) * 0.05
        inner.rotation.y = Math.sin(t * 0.5) * 0.35
        starMesh.rotation.z = t * 0.6
        sparkles.rotation.y = t * 0.15
        pearls.forEach((p, i) => (p.a += dt * (0.3 + i * 0.08)))
        // wave and Rose Quartz & Serenity sway the stick, like a crowd in the stands
        const sway = mode === 'wave' || mode === 'carat' ? Math.sin(t * 2.1) * 0.24 : 0
        stick.rotation.z += (sway - stick.rotation.z) * Math.min(1, dt * 4)
      }
      pearls.forEach((p) => p.m.position.set(Math.cos(p.a) * 1.46, Math.sin(p.a) * 1.46, 0))
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Sprite) {
          o.geometry.dispose()
          ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => m.dispose())
        }
      })
      ;[radialTex, dotTex, collarTex].forEach((t) => t.dispose())
      scene.environment?.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onFail])

  return <div ref={host} className="stick__3d" aria-hidden />
}
