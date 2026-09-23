/**
 * scene3d.js - Three.js 3D Visualizer & Dimensional Gate Engine
 * Provides:
 * 1. Background 3D cosmic particle storm & mana motes
 * 2. 3D Mana Core in Status Tab (pulsating crystal + spinning orbit rings)
 * 3. 3D Dimensional Gate Portal in Dungeons Tab (volumetric particle vortex reacting to Gate Rank)
 * 4. Fallback procedural canvas rendering if Three.js CDN is unavailable
 */

class Scene3DManager {
  constructor() {
    this.hasThree = typeof THREE !== 'undefined';
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.currentGateColor = 0x38bdf8; // default mana blue
    this.clock = this.hasThree ? new THREE.Clock() : null;

    this.initMouseTracking();
    this.initBackgroundScene();
    this.initManaCoreScene();
    this.initGatePortalScene();
  }

  initMouseTracking() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }

  // 1. BACKGROUND 3D COSMIC FIELD
  initBackgroundScene() {
    const canvas = document.getElementById('bg-3d-canvas');
    if (!canvas) return;

    if (!this.hasThree) {
      this.initFallbackBackground(canvas);
      return;
    }

    try {
      this.bgScene = new THREE.Scene();
      this.bgCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
      this.bgCamera.position.z = 400;

      this.bgRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      this.bgRenderer.setSize(window.innerWidth, window.innerHeight);
      this.bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Starfield / Mana motes particles
      const particleCount = 700;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const color1 = new THREE.Color(0x00f0ff); // cyan
      const color2 = new THREE.Color(0xa855f7); // purple
      const color3 = new THREE.Color(0x38bdf8); // sky

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 1200;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 800;

        const mixed = i % 3 === 0 ? color1 : (i % 3 === 1 ? color2 : color3);
        colors[i * 3] = mixed.r;
        colors[i * 3 + 1] = mixed.g;
        colors[i * 3 + 2] = mixed.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 3.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });

      this.bgParticles = new THREE.Points(geometry, material);
      this.bgScene.add(this.bgParticles);

      window.addEventListener('resize', () => {
        if (!this.bgCamera || !this.bgRenderer) return;
        this.bgCamera.aspect = window.innerWidth / window.innerHeight;
        this.bgCamera.updateProjectionMatrix();
        this.bgRenderer.setSize(window.innerWidth, window.innerHeight);
      });

      const animateBg = () => {
        requestAnimationFrame(animateBg);
        this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
        this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

        if (this.bgParticles) {
          this.bgParticles.rotation.y += 0.0006;
          this.bgParticles.rotation.x = this.mouse.y * 0.05;
          this.bgParticles.rotation.y += this.mouse.x * 0.001;
        }

        this.bgRenderer.render(this.bgScene, this.bgCamera);
      };
      animateBg();
    } catch (e) {
      console.warn("WebGL background init failed, using fallback:", e);
      this.initFallbackBackground(canvas);
    }
  }

  // 2. 3D MANA CORE (STATUS TAB)
  initManaCoreScene() {
    const container = document.getElementById('mana-core-3d');
    if (!container || !this.hasThree) return;

    try {
      const width = container.clientWidth || 300;
      const height = container.clientHeight || 260;

      this.coreScene = new THREE.Scene();
      this.coreCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      this.coreCamera.position.z = 5.2;

      this.coreRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.coreRenderer.setSize(width, height);
      this.coreRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(this.coreRenderer.domElement);

      // Central Polyhedron (The Mana Core)
      const coreGeo = new THREE.IcosahedronGeometry(1.2, 0);
      const coreMat = new THREE.MeshPhongMaterial({
        color: 0x00f0ff,
        emissive: 0x0284c7,
        wireframe: true,
        wireframeLinewidth: 2,
        transparent: true,
        opacity: 0.85
      });
      this.manaCoreMesh = new THREE.Mesh(coreGeo, coreMat);
      this.coreScene.add(this.manaCoreMesh);

      // Inner glowing octahedron
      const innerGeo = new THREE.OctahedronGeometry(0.7, 0);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: false,
        transparent: true,
        opacity: 0.4
      });
      this.innerCoreMesh = new THREE.Mesh(innerGeo, innerMat);
      this.coreScene.add(this.innerCoreMesh);

      // Outer Ring 1
      const ringGeo1 = new THREE.TorusGeometry(1.8, 0.02, 16, 100);
      const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.6 });
      this.ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      this.coreScene.add(this.ring1);

      // Outer Ring 2 (Tilted)
      const ringGeo2 = new THREE.TorusGeometry(2.1, 0.02, 16, 100);
      const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 });
      this.ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      this.ring2.rotation.x = Math.PI / 3;
      this.coreScene.add(this.ring2);

      // Lighting
      const pLight = new THREE.PointLight(0x00f0ff, 2.5, 10);
      pLight.position.set(2, 3, 4);
      this.coreScene.add(pLight);

      const aLight = new THREE.AmbientLight(0x1e1b4b, 1.2);
      this.coreScene.add(aLight);

      const animateCore = () => {
        requestAnimationFrame(animateCore);
        const t = performance.now() * 0.001;

        if (this.manaCoreMesh) {
          this.manaCoreMesh.rotation.x = t * 0.4;
          this.manaCoreMesh.rotation.y = t * 0.6;
          const scale = 1 + Math.sin(t * 2) * 0.06;
          this.manaCoreMesh.scale.set(scale, scale, scale);
        }

        if (this.innerCoreMesh) {
          this.innerCoreMesh.rotation.x = -t * 0.7;
          this.innerCoreMesh.rotation.y = -t * 0.5;
        }

        if (this.ring1) {
          this.ring1.rotation.z = t * 0.5;
          this.ring1.rotation.y = t * 0.3;
        }

        if (this.ring2) {
          this.ring2.rotation.z = -t * 0.4;
          this.ring2.rotation.x = (Math.PI / 3) + Math.sin(t) * 0.2;
        }

        this.coreRenderer.render(this.coreScene, this.coreCamera);
      };
      animateCore();
    } catch (e) {
      console.warn("Mana core init error:", e);
    }
  }

  // 3. 3D DIMENSIONAL GATE PORTAL (DUNGEONS TAB)
  initGatePortalScene() {
    const container = document.getElementById('gate-portal-3d');
    if (!container || !this.hasThree) return;

    try {
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 260;

      this.gateScene = new THREE.Scene();
      this.gateCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
      this.gateCamera.position.z = 6;

      this.gateRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.gateRenderer.setSize(width, height);
      this.gateRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(this.gateRenderer.domElement);

      // Dimensional Gate Particle Vortex
      const particleCount = 1200;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      this.gateParticlesData = [];
      const baseColor = new THREE.Color(this.currentGateColor);

      for (let i = 0; i < particleCount; i++) {
        const radius = 0.4 + Math.random() * 2.8;
        const angle = Math.random() * Math.PI * 2;
        const speed = (1 / radius) * 0.035;
        const z = (Math.random() - 0.5) * 1.5;

        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius;
        positions[i * 3 + 2] = z;

        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;

        this.gateParticlesData.push({ radius, angle, speed, z });
      }

      this.gateGeometry = new THREE.BufferGeometry();
      this.gateGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.gateGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      this.gateMaterial = new THREE.PointsMaterial({
        size: 3.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });

      this.gatePoints = new THREE.Points(this.gateGeometry, this.gateMaterial);
      this.gateScene.add(this.gatePoints);

      // Event Horizon Ring
      const ringGeo = new THREE.RingGeometry(0.3, 0.45, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.currentGateColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      this.eventHorizon = new THREE.Mesh(ringGeo, ringMat);
      this.gateScene.add(this.eventHorizon);

      const animateGate = () => {
        requestAnimationFrame(animateGate);
        const posAttr = this.gateGeometry.attributes.position;
        const positionsArr = posAttr.array;

        for (let i = 0; i < this.gateParticlesData.length; i++) {
          const p = this.gateParticlesData[i];
          p.angle += p.speed;

          positionsArr[i * 3] = Math.cos(p.angle) * p.radius;
          positionsArr[i * 3 + 1] = Math.sin(p.angle) * p.radius;

          // Pull slightly toward core then reset outward
          p.radius -= 0.003;
          if (p.radius < 0.3) {
            p.radius = 2.8;
          }
        }
        posAttr.needsUpdate = true;

        if (this.eventHorizon) {
          const t = performance.now() * 0.002;
          const scale = 1 + Math.sin(t) * 0.15;
          this.eventHorizon.scale.set(scale, scale, 1);
        }

        // Slight tilt responding to mouse
        if (this.gatePoints) {
          this.gatePoints.rotation.x = this.mouse.y * 0.2;
          this.gatePoints.rotation.y = this.mouse.x * 0.3;
        }

        this.gateRenderer.render(this.gateScene, this.gateCamera);
      };
      animateGate();
    } catch (e) {
      console.warn("Gate portal 3D error:", e);
    }
  }

  // Update Gate Portal Color based on Dungeon Rank
  setGateRankColor(rank) {
    if (!this.hasThree || !this.gateGeometry) return;
    const rankColors = {
      'E': 0x94a3b8, // Slate
      'D': 0x22c55e, // Emerald
      'C': 0x38bdf8, // Mana Sky Blue
      'B': 0x818cf8, // Indigo
      'A': 0xc084fc, // Purple
      'S': 0xef4444  // Fiery Crimson
    };
    const targetHex = rankColors[rank] || 0x38bdf8;
    this.currentGateColor = targetHex;

    const targetColor = new THREE.Color(targetHex);
    const colorAttr = this.gateGeometry.attributes.color;
    const arr = colorAttr.array;

    for (let i = 0; i < this.gateParticlesData.length; i++) {
      // Blend slightly with white or purple
      arr[i * 3] = targetColor.r;
      arr[i * 3 + 1] = targetColor.g;
      arr[i * 3 + 2] = targetColor.b;
    }
    colorAttr.needsUpdate = true;

    if (this.eventHorizon) {
      this.eventHorizon.material.color.setHex(targetHex);
    }
  }

  // Fallback 2D canvas starfield if Three.js is blocked
  initFallbackBackground(canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.7 + 0.3
    }));

    const renderFallback = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${s.alpha})`;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      requestAnimationFrame(renderFallback);
    };
    renderFallback();
  }
}

window.Scene3DManager = Scene3DManager;
